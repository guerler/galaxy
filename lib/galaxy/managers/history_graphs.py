"""Manager for building history graph structures."""

from typing import Optional

from galaxy import model
from galaxy.schema.history_graphs import (
    HistoryGraph,
    HistoryGraphCollectionNode,
    HistoryGraphDatasetNode,
    HistoryGraphEdge,
    HistoryGraphEdgeRelationship,
    HistoryGraphJobNode,
    HistoryGraphNodeType,
)
from galaxy.security.idencoding import IdEncodingHelper


class HistoryGraphManager:
    """Manager for building graph representations of history lineage."""

    def __init__(self, security: IdEncodingHelper):
        self.security = security

    def build_graph(self, history: model.History, depth: Optional[int] = None) -> HistoryGraph:
        """Build a graph of datasets, collections, and jobs in a history.

        Args:
            history: An already-authorized History object.
            depth: Optional depth limit for traversal (reserved for future use).

        Returns:
            HistoryGraph containing all nodes and edges representing the lineage.
        """
        # depth parameter reserved for future traversal limiting
        _ = depth
        nodes: list = []
        edges: list[HistoryGraphEdge] = []

        # Track visited items to avoid duplicates
        visited_datasets: set[int] = set()
        visited_collections: set[int] = set()
        visited_jobs: set[int] = set()

        # Process all datasets in the history
        for hda in history.datasets:
            if hda.id in visited_datasets:
                continue
            visited_datasets.add(hda.id)

            # Add dataset node
            nodes.append(self._create_dataset_node(hda))

            # Find creating job and add edges
            creating_job = hda.creating_job
            if creating_job and creating_job.history_id == history.id:
                self._process_job(
                    creating_job,
                    history,
                    nodes,
                    edges,
                    visited_jobs,
                    visited_datasets,
                    visited_collections,
                )

        # Process all dataset collections in the history
        for hdca in history.dataset_collections:
            if hdca.id in visited_collections:
                continue
            visited_collections.add(hdca.id)

            # Add collection node
            nodes.append(self._create_collection_node(hdca))

            # Find creating job associations and add edges
            if hdca.creating_job_associations:
                for job_assoc in hdca.creating_job_associations:
                    job = job_assoc.job
                    if job and job.history_id == history.id:
                        self._process_job(
                            job,
                            history,
                            nodes,
                            edges,
                            visited_jobs,
                            visited_datasets,
                            visited_collections,
                        )

        return HistoryGraph(nodes=nodes, edges=edges)

    def _process_job(
        self,
        job: model.Job,
        history: model.History,
        nodes: list,
        edges: list[HistoryGraphEdge],
        visited_jobs: set[int],
        visited_datasets: set[int],
        visited_collections: set[int],
    ) -> None:
        """Process a job and its input/output relationships."""
        if job.id in visited_jobs:
            # Job already processed, but we still need to add output edge for this context
            return
        visited_jobs.add(job.id)

        # Add job node
        nodes.append(self._create_job_node(job))

        # Process input datasets - add edges from datasets to job
        for input_assoc in job.input_datasets:
            dataset = input_assoc.dataset
            if dataset and dataset.history_id == history.id:
                # Ensure input dataset node exists
                if dataset.id not in visited_datasets:
                    visited_datasets.add(dataset.id)
                    nodes.append(self._create_dataset_node(dataset))

                edges.append(
                    HistoryGraphEdge(
                        source_id=self.security.encode_id(dataset.id),
                        source_type=HistoryGraphNodeType.HDA,
                        target_id=self.security.encode_id(job.id),
                        target_type=HistoryGraphNodeType.JOB,
                        relationship=HistoryGraphEdgeRelationship.INPUT_TO,
                    )
                )

        # Process input collections - add edges from collections to job
        for input_assoc in job.input_dataset_collections:
            collection = input_assoc.dataset_collection
            if collection and collection.history_id == history.id:
                # Ensure input collection node exists
                if collection.id not in visited_collections:
                    visited_collections.add(collection.id)
                    nodes.append(self._create_collection_node(collection))

                edges.append(
                    HistoryGraphEdge(
                        source_id=self.security.encode_id(collection.id),
                        source_type=HistoryGraphNodeType.HDCA,
                        target_id=self.security.encode_id(job.id),
                        target_type=HistoryGraphNodeType.JOB,
                        relationship=HistoryGraphEdgeRelationship.INPUT_TO,
                    )
                )

        # Process output datasets - add edges from job to datasets
        for output_assoc in job.output_datasets:
            dataset = output_assoc.dataset
            if dataset and dataset.history_id == history.id:
                # Ensure output dataset node exists
                if dataset.id not in visited_datasets:
                    visited_datasets.add(dataset.id)
                    nodes.append(self._create_dataset_node(dataset))

                edges.append(
                    HistoryGraphEdge(
                        source_id=self.security.encode_id(job.id),
                        source_type=HistoryGraphNodeType.JOB,
                        target_id=self.security.encode_id(dataset.id),
                        target_type=HistoryGraphNodeType.HDA,
                        relationship=HistoryGraphEdgeRelationship.OUTPUT_OF,
                    )
                )

        # Process output collections - add edges from job to collections
        for output_assoc in job.output_dataset_collection_instances:
            collection = output_assoc.dataset_collection_instance
            if collection and collection.history_id == history.id:
                # Ensure output collection node exists
                if collection.id not in visited_collections:
                    visited_collections.add(collection.id)
                    nodes.append(self._create_collection_node(collection))

                edges.append(
                    HistoryGraphEdge(
                        source_id=self.security.encode_id(job.id),
                        source_type=HistoryGraphNodeType.JOB,
                        target_id=self.security.encode_id(collection.id),
                        target_type=HistoryGraphNodeType.HDCA,
                        relationship=HistoryGraphEdgeRelationship.OUTPUT_OF,
                    )
                )

    def _create_dataset_node(self, hda: model.HistoryDatasetAssociation) -> HistoryGraphDatasetNode:
        """Create a dataset node from an HDA."""
        return HistoryGraphDatasetNode(
            id=self.security.encode_id(hda.id),
            type=HistoryGraphNodeType.HDA,
            hid=hda.hid,
            name=hda.name,
            state=hda.state,
            extension=hda.extension,
        )

    def _create_collection_node(
        self, hdca: model.HistoryDatasetCollectionAssociation
    ) -> HistoryGraphCollectionNode:
        """Create a collection node from an HDCA."""
        collection_type = None
        if hdca.collection:
            collection_type = hdca.collection.collection_type
        return HistoryGraphCollectionNode(
            id=self.security.encode_id(hdca.id),
            type=HistoryGraphNodeType.HDCA,
            hid=hdca.hid,
            name=hdca.name,
            collection_type=collection_type,
        )

    def _create_job_node(self, job: model.Job) -> HistoryGraphJobNode:
        """Create a job node."""
        return HistoryGraphJobNode(
            id=self.security.encode_id(job.id),
            type=HistoryGraphNodeType.JOB,
            tool_id=job.tool_id,
            tool_version=job.tool_version,
            state=job.state,
        )
