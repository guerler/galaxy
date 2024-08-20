import axios from "axios";

import { type components, GalaxyApi, type GalaxyApiPaths, type HDADetailed } from "@/api";
import { withPrefix } from "@/utils/redirect";
import { rethrowSimple } from "@/utils/simple-error";

export async function fetchDatasetDetails(params: { id: string }): Promise<HDADetailed> {
    const { data, error } = await GalaxyApi().GET("/api/datasets/{dataset_id}", {
        params: {
            path: {
                dataset_id: params.id,
            },
            query: { view: "detailed" },
        },
    });

    if (error) {
        rethrowSimple(error);
    }
    return data as HDADetailed;
}

export async function undeleteDataset(datasetId: string) {
    const { data, error } = await GalaxyApi().PUT("/api/datasets/{dataset_id}", {
        params: {
            path: { dataset_id: datasetId },
        },
        body: {
            deleted: false,
        },
    });
    if (error) {
        rethrowSimple(error);
    }
    return data;
}

export async function purgeDataset(datasetId: string) {
    const { data, error } = await GalaxyApi().DELETE("/api/datasets/{dataset_id}", {
        params: {
            path: { dataset_id: datasetId },
            query: { purge: true },
        },
    });
    if (error) {
        rethrowSimple(error);
    }
    return data;
}

type CopyContentParamsType = GalaxyApiPaths["/api/histories/{history_id}/contents/{type}s"]["post"]["parameters"];
type CopyContentBodyType = components["schemas"]["CreateHistoryContentPayload"];

export async function copyContent(
    contentId: CopyContentBodyType["content"],
    historyId: CopyContentParamsType["path"]["history_id"],
    type: CopyContentParamsType["path"]["type"] = "dataset"
) {
    const source = type === "dataset" ? "hda" : "hdca";
    const { data, error } = await GalaxyApi().POST("/api/histories/{history_id}/contents/{type}s", {
        params: {
            path: { history_id: historyId, type },
        },
        body: {
            source,
            content: contentId,
            // TODO: Investigate. These should be optional, but the API requires explicit null values?
            type,
            copy_elements: null,
            hide_source_items: null,
            instance_type: null,
        },
    });
    if (error) {
        rethrowSimple(error);
    }
    return data;
}

export function getCompositeDatasetLink(historyDatasetId: string, path: string) {
    return withPrefix(`/api/datasets/${historyDatasetId}/display?filename=${path}`);
}

export type DatasetExtraFiles = components["schemas"]["DatasetExtraFiles"];

export async function fetchDatasetAttributes(datasetId: string) {
    const { data } = await axios.get(withPrefix(`/dataset/get_edit?dataset_id=${datasetId}`));

    return data;
}
