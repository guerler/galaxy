"""Pydantic models for the History Graph API endpoint."""

from enum import Enum
from typing import (
    Annotated,
    Literal,
    Optional,
    Union,
)

from pydantic import Field

from galaxy.schema.fields import EncodedDatabaseIdField
from galaxy.schema.schema import Model


class HistoryGraphNodeType(str, Enum):
    """Type of node in a history graph."""

    HDA = "hda"
    HDCA = "hdca"
    JOB = "job"


class HistoryGraphEdgeRelationship(str, Enum):
    """Relationship type for edges in a history graph."""

    INPUT_TO = "input_to"  # dataset/collection was input to job
    OUTPUT_OF = "output_of"  # job produced dataset/collection


class HistoryGraphDatasetNode(Model):
    """A dataset (HDA) node in the history graph."""

    id: EncodedDatabaseIdField = Field(
        ...,
        title="ID",
        description="Encoded database ID of the dataset.",
    )
    type: Literal[HistoryGraphNodeType.HDA] = Field(
        HistoryGraphNodeType.HDA,
        title="Type",
        description="Node type discriminator.",
    )
    hid: Optional[int] = Field(
        None,
        title="HID",
        description="History index number (display metadata only).",
    )
    name: Optional[str] = Field(
        None,
        title="Name",
        description="Name of the dataset.",
    )
    state: Optional[str] = Field(
        None,
        title="State",
        description="Current state of the dataset.",
    )
    extension: Optional[str] = Field(
        None,
        title="Extension",
        description="File extension/datatype of the dataset.",
    )


class HistoryGraphCollectionNode(Model):
    """A dataset collection (HDCA) node in the history graph."""

    id: EncodedDatabaseIdField = Field(
        ...,
        title="ID",
        description="Encoded database ID of the collection.",
    )
    type: Literal[HistoryGraphNodeType.HDCA] = Field(
        HistoryGraphNodeType.HDCA,
        title="Type",
        description="Node type discriminator.",
    )
    hid: Optional[int] = Field(
        None,
        title="HID",
        description="History index number (display metadata only).",
    )
    name: Optional[str] = Field(
        None,
        title="Name",
        description="Name of the collection.",
    )
    collection_type: Optional[str] = Field(
        None,
        title="Collection Type",
        description="Type of the collection (e.g., 'list', 'paired').",
    )


class HistoryGraphJobNode(Model):
    """A job node in the history graph."""

    id: EncodedDatabaseIdField = Field(
        ...,
        title="ID",
        description="Encoded database ID of the job.",
    )
    type: Literal[HistoryGraphNodeType.JOB] = Field(
        HistoryGraphNodeType.JOB,
        title="Type",
        description="Node type discriminator.",
    )
    tool_id: Optional[str] = Field(
        None,
        title="Tool ID",
        description="ID of the tool that ran this job.",
    )
    tool_version: Optional[str] = Field(
        None,
        title="Tool Version",
        description="Version of the tool that ran this job.",
    )
    state: Optional[str] = Field(
        None,
        title="State",
        description="Current state of the job.",
    )


# Discriminated union of all node types
HistoryGraphNode = Annotated[
    Union[HistoryGraphDatasetNode, HistoryGraphCollectionNode, HistoryGraphJobNode],
    Field(discriminator="type"),
]


class HistoryGraphEdge(Model):
    """An edge connecting two nodes in the history graph."""

    source_id: EncodedDatabaseIdField = Field(
        ...,
        title="Source ID",
        description="Encoded database ID of the source node.",
    )
    source_type: HistoryGraphNodeType = Field(
        ...,
        title="Source Type",
        description="Type of the source node.",
    )
    target_id: EncodedDatabaseIdField = Field(
        ...,
        title="Target ID",
        description="Encoded database ID of the target node.",
    )
    target_type: HistoryGraphNodeType = Field(
        ...,
        title="Target Type",
        description="Type of the target node.",
    )
    relationship: HistoryGraphEdgeRelationship = Field(
        ...,
        title="Relationship",
        description="The relationship type of this edge.",
    )


class HistoryGraph(Model):
    """Complete graph structure for a history's lineage."""

    nodes: list[HistoryGraphNode] = Field(
        default_factory=list,
        title="Nodes",
        description="All nodes (datasets, collections, jobs) in the history graph.",
    )
    edges: list[HistoryGraphEdge] = Field(
        default_factory=list,
        title="Edges",
        description="All edges (input/output relationships) in the history graph.",
    )
