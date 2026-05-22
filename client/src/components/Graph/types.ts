import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

/** A labeled port on a graph node (input or output connector) */
export interface GraphNodePort {
    name: string;
    label: string;
    /** Id of the edge this port terminates — lets the layout route edges to the port. */
    edgeId?: string;
    /** Connector variant for this port's connector. */
    variant?: ConnectorVariant;
    /** Vertical offset (px from the node top) of the connector — set in expanded mode. */
    offsetY?: number;
}

/** Connector visual variant — "multiple" renders larger (used to mark collections). */
export type ConnectorVariant = "single" | "multiple";

/** A positioned node after layout */
export interface GraphNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    icon: IconDefinition;
    badge?: string | null;
    cssClass?: string;
    /** Input ports displayed in the node body */
    inputs?: GraphNodePort[];
    /** Output ports displayed in the node body */
    outputs?: GraphNodePort[];
    /** Connector straddling the node's input (left) edge when it has incoming edges. */
    inputConnector?: ConnectorVariant | null;
    /** Connector straddling the node's output (right) edge when it has outgoing edges. */
    outputConnector?: ConnectorVariant | null;
    /** Arbitrary domain data attached by the mapper */
    data?: Record<string, unknown>;
}

/** A positioned edge after layout, with routed points */
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    cssClass?: string;
    /** Render as a collection ribbon (multiple parallel lines) */
    isCollection?: boolean;
    points: { x: number; y: number }[];
}

/** Complete layout result ready for rendering */
export interface GraphLayout {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width: number;
    height: number;
}
