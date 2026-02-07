import logging
from typing import (
    Optional,
    Union,
)

from galaxy.files.models import (
    AnyRemoteEntry,
    FilesSourceRuntimeContext,
    RemoteDirectory,
    RemoteFile,
)
from galaxy.files.sources._fsspec import (
    CacheOptionsDictType,
    FsspecBaseFileSourceConfiguration,
    FsspecBaseFileSourceTemplateConfiguration,
    FsspecFilesSource,
)
from galaxy.util.config_templates import TemplateExpansion

try:
    from adlfs import AzureBlobFileSystem
except ImportError:
    AzureBlobFileSystem = None

try:
    from azure.storage.blob import BlobServiceClient
except ImportError:
    BlobServiceClient = None


REQUIRED_PACKAGE = "adlfs"
FS_PLUGIN_TYPE = "azureflat"
INACCESSIBLE_TIERS = {"Archive"}

log = logging.getLogger(__name__)


class AzureFlatFileSourceTemplateConfiguration(FsspecBaseFileSourceTemplateConfiguration):
    account_name: Union[str, TemplateExpansion]
    container_name: Union[str, TemplateExpansion, None] = None
    account_key: Union[str, TemplateExpansion]


class AzureFlatFileSourceConfiguration(FsspecBaseFileSourceConfiguration):
    account_name: str
    container_name: Optional[str] = None
    account_key: str


class AzureFlatFilesSource(
    FsspecFilesSource[AzureFlatFileSourceTemplateConfiguration, AzureFlatFileSourceConfiguration]
):
    plugin_type = FS_PLUGIN_TYPE
    required_module = AzureBlobFileSystem
    required_package = REQUIRED_PACKAGE
    template_config_class = AzureFlatFileSourceTemplateConfiguration
    resolved_config_class = AzureFlatFileSourceConfiguration

    def _open_fs(
        self, context: FilesSourceRuntimeContext[AzureFlatFileSourceConfiguration], cache_options: CacheOptionsDictType
    ):
        if AzureBlobFileSystem is None:
            raise self.required_package_exception
        else:
            config = context.config
            fs = AzureBlobFileSystem(account_name=config.account_name, credential=config.account_key, **cache_options)
            return fs

    def _get_blob_service_client(self, config: AzureFlatFileSourceConfiguration) -> Optional["BlobServiceClient"]:
        if BlobServiceClient is None:
            return None
        return BlobServiceClient(
            account_url=f"https://{config.account_name}.blob.core.windows.net",
            credential=config.account_key,
        )

    def _to_container_path(self, path: str, config: AzureFlatFileSourceConfiguration) -> str:
        result = ""
        if path.startswith("az://"):
            result = path.replace("az://", "", 1)
        else:
            container = config.container_name
            if not container:
                result = path.strip("/")
            else:
                result = self._container_path(container, path)
        return result

    def _adapt_entry_path(self, filesystem_path: str) -> str:
        result = filesystem_path
        container_name = self.template_config.container_name
        if container_name:
            prefix = f"{container_name}/"
            if filesystem_path.startswith(prefix):
                result = filesystem_path.replace(prefix, "", 1)
            else:
                result = filesystem_path
        else:
            result = filesystem_path
        return result

    def _list(
        self,
        context: FilesSourceRuntimeContext[AzureFlatFileSourceConfiguration],
        path: str = "/",
        recursive: bool = False,
        write_intent: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        query: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> tuple[list[AnyRemoteEntry], int]:
        if context.config.container_name is None and path == "/":
            fs = self._open_fs(context, {})
            containers = fs.ls("", detail=True)
            entries: list[AnyRemoteEntry] = []
            for entry in containers:
                name = entry["name"]
                uri = f"az://{name}"
                entries.append(
                    RemoteDirectory(
                        name=name,
                        uri=uri,
                        path=f"/{name}",
                    )
                )
            return entries, len(entries)
        container_path = self._to_container_path(path, context.config)
        entries, count = super()._list(
            context=context,
            path=container_path,
            recursive=recursive,
            limit=limit,
            offset=offset,
            query=query,
            sort_by=sort_by,
        )
        filtered = self._filter_inaccessible(entries, container_path, context.config)
        return filtered, len(filtered)

    def _filter_inaccessible(
        self,
        entries: list[AnyRemoteEntry],
        container_path: str,
        config: AzureFlatFileSourceConfiguration,
    ) -> list[AnyRemoteEntry]:
        """Filter out blobs in inaccessible tiers (e.g. Archive) using the Azure SDK.

        Since adlfs does not expose blob_tier in its listing output, this method
        uses the sync Azure SDK to check access tiers for the current directory level only.
        """
        blob_service = self._get_blob_service_client(config)
        if blob_service is None:
            return entries

        # Split container_path into container name and blob prefix
        stripped = container_path.strip("/")
        parts = stripped.split("/", 1)
        container_name = parts[0]
        prefix = parts[1] + "/" if len(parts) > 1 else ""

        try:
            cc = blob_service.get_container_client(container_name)
            archived_blobs: set[str] = set()
            for blob in cc.walk_blobs(name_starts_with=prefix or None):
                if hasattr(blob, "blob_tier") and blob.blob_tier in INACCESSIBLE_TIERS:
                    # blob.name is relative to the container e.g. "path/to/file.txt"
                    # Build the full filesystem path as adlfs would: "container/path/to/file.txt"
                    archived_blobs.add(f"{container_name}/{blob.name}")
                    log.debug("Skipping archived blob: %s/%s (tier=%s)", container_name, blob.name, blob.blob_tier)
        except Exception:
            log.exception("Failed to check blob tiers for container %s, returning unfiltered list", container_name)
            return entries

        if not archived_blobs:
            return entries

        filtered: list[AnyRemoteEntry] = []
        for entry in entries:
            if isinstance(entry, RemoteFile):
                # entry.path comes from _adapt_entry_path which may have stripped
                # the container prefix. Reconstruct the full filesystem path.
                entry_path = entry.path.lstrip("/")
                if config.container_name and not entry_path.startswith(f"{config.container_name}/"):
                    full_path = f"{config.container_name}/{entry_path}"
                else:
                    full_path = entry_path
                if full_path in archived_blobs:
                    continue
            filtered.append(entry)
        return filtered

    def _realize_to(
        self, source_path: str, native_path: str, context: FilesSourceRuntimeContext[AzureFlatFileSourceConfiguration]
    ):
        container_path = self._to_container_path(source_path, context.config)
        try:
            super()._realize_to(source_path=container_path, native_path=native_path, context=context)
        except Exception as e:
            error_msg = str(e)
            if "BlobArchived" in error_msg or "archived blob" in error_msg.lower():
                raise Exception(
                    f"Cannot download '{source_path}': the blob is in the Archive access tier "
                    f"and must be rehydrated to Hot or Cool tier before it can be read."
                ) from e
            raise

    def _write_from(
        self, target_path: str, native_path: str, context: FilesSourceRuntimeContext[AzureFlatFileSourceConfiguration]
    ):
        container_path = self._to_container_path(target_path, context.config)
        super()._write_from(target_path=container_path, native_path=native_path, context=context)

    def _container_path(self, container_name: str, path: str) -> str:
        adjusted_path = path
        if path.startswith("az://"):
            adjusted_path = path.replace("az://", "", 1)
        else:
            if not path.startswith("/"):
                adjusted_path = f"/{path}"
            else:
                adjusted_path = path
        return f"{container_name}{adjusted_path}"

    def score_url_match(self, url: str):
        container_name = self.template_config.container_name
        result = 0
        if container_name:
            prefix = f"az://{container_name}"
            if url.startswith(f"{prefix}/") or url == prefix:
                result = len(prefix)
            else:
                result = super().score_url_match(url)
        else:
            if url.startswith("az://"):
                result = len("az://")
            else:
                result = super().score_url_match(url)
        return result


__all__ = ("AzureFlatFilesSource",)
