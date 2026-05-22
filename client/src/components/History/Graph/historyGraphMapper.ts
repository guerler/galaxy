import { faFile, faLayerGroup, faWrench } from "@fortawesome/free-solid-svg-icons";

import type { components } from "@/api/schema";
import { computeNodeHeight, portOffsetY } from "@/components/Graph/nodeGeometry";
import type { ConnectorVariant, GraphEdge, GraphNode, GraphNodePort } from "@/components/Graph/types";
import { type StateRepresentation, STATES } from "@/components/History/Content/model/states";

type ApiGraphNode = components["schemas"]["GraphNode"];
type ApiGraphEdge = components["schemas"]["GraphEdge"];
export type HistoryGraphResponse = components["schemas"]["HistoryGraphResponse"];

/** Node width — uniform across all types */
const NODE_WIDTH = 200;

/** User-facing labels keyed by node src */
export const NODE_TYPE_LABELS: Record<string, string> = {
    hda: "Dataset",
    hdca: "Collection",
    tool_request: "Tool Execution",
};

const NODE_ICONS: Record<string, typeof faFile> = {
    hda: faFile,
    hdca: faLayerGroup,
    tool_request: faWrench,
};

const NODE_CSS_CLASS: Record<string, string> = {
    hda: "node-dataset",
    hdca: "node-collection",
    tool_request: "node-tool-request",
};

/** Stable string key for the generic renderer, derived from the (src, id) ref. */
function nodeKey(ref: { src: string; id: string }): string {
    return `${ref.src}:${ref.id}`;
}

// ── Label resolution ──

function resolveNodeLabel(node: ApiGraphNode): string {
    const hid = node.hid ? `${node.hid}: ` : "";
    switch (node.src) {
        case "hda":
            return `${hid}${node.name ?? node.extension ?? "Dataset"}`;
        case "hdca":
            return `${hid}${node.name ?? node.collection_type ?? "Collection"}`;
        case "tool_request":
            return node.tool_name ?? shortenToolId(node.tool_id);
    }
}

function resolveNodeBadge(node: ApiGraphNode): string | null {
    switch (node.src) {
        case "hda":
            return node.extension ?? null;
        case "hdca":
            return node.collection_type ?? null;
        case "tool_request":
            return null;
    }
}

function shortenToolId(toolId: string | null | undefined): string {
    if (!toolId) {
        return "Tool";
    }
    // Strip toolshed prefix:
    // "toolshed.g2.bx.psu.edu/repos/iuc/bwa_mem/bwa_mem/1.0" → "bwa_mem"
    const parts = toolId.split("/");
    if (parts.length >= 2) {
        return parts[parts.length - 2] ?? toolId;
    }
    return toolId;
}

function isCollectionEdge(edge: ApiGraphEdge): boolean {
    return edge.type === "collection_input" || edge.type === "collection_output";
}

/**
 * Connector variant at one end of an edge — the single source of truth shared by
 * the edge ribbon and the node connectors, so the two can never disagree.
 * A data node's end follows the node kind; a tool node's end follows the edge kind.
 */
function edgeEndVariant(ref: { src: string }, edge: ApiGraphEdge): ConnectorVariant {
    if (ref.src === "hdca") {
        return "multiple";
    }
    if (ref.src === "hda") {
        return "single";
    }
    return isCollectionEdge(edge) ? "multiple" : "single";
}

/** Variant of a node's merged connector — "multiple" if any port on the side is a collection. */
function mergedConnectorVariant(ports: GraphNodePort[] | undefined): ConnectorVariant | null {
    if (!ports || ports.length === 0) {
        return null;
    }
    return ports.some((port) => port.variant === "multiple") ? "multiple" : "single";
}

/** Connection summary shown in a collapsed tool node's body, e.g. "3 inputs, 2 outputs". */
function toolConnectionSummary(inputCount: number, outputCount: number): string {
    const parts: string[] = [];
    if (inputCount > 0) {
        parts.push(`${inputCount} input${inputCount === 1 ? "" : "s"}`);
    }
    if (outputCount > 0) {
        parts.push(`${outputCount} output${outputCount === 1 ? "" : "s"}`);
    }
    return parts.join(", ");
}

// ── Public API ──

/**
 * Map API graph nodes to generic GraphNode[] for the renderer.
 * Returns nodes with dimensions, labels, icons, badges, and domain data.
 *
 * The node identified by `expandedNodeId` is rendered expanded — a tool node
 * then exposes one connector per port; every other node stays collapsed.
 */
export function mapNodes(
    apiNodes: ApiGraphNode[],
    apiEdges: ApiGraphEdge[],
    expandedNodeId: string | null,
): GraphNode[] {
    // Build a lookup for node labels by renderer key
    const nodeLabels = new Map<string, string>();
    for (const node of apiNodes) {
        nodeLabels.set(nodeKey(node), resolveNodeLabel(node));
    }

    // Build input/output port lists per node from edges. Each port records the
    // edge it terminates (for routing) and a connector variant (from the edge kind).
    const inputPorts = new Map<string, GraphNodePort[]>();
    const outputPorts = new Map<string, GraphNodePort[]>();
    apiEdges.forEach((edge, idx) => {
        const edgeId = `e${idx}`;
        const sourceKey = nodeKey(edge.source);
        const targetKey = nodeKey(edge.target);
        const sourceLabel = nodeLabels.get(sourceKey) ?? sourceKey;
        const targetLabel = nodeLabels.get(targetKey) ?? targetKey;

        // Each port's variant is the edge's connector variant at that node's end,
        // so a port connector always matches the edge that meets it.
        if (!inputPorts.has(targetKey)) {
            inputPorts.set(targetKey, []);
        }
        inputPorts.get(targetKey)!.push({
            name: sourceKey,
            label: edge.name ?? sourceLabel,
            edgeId,
            variant: edgeEndVariant(edge.target, edge),
        });

        if (!outputPorts.has(sourceKey)) {
            outputPorts.set(sourceKey, []);
        }
        outputPorts.get(sourceKey)!.push({
            name: targetKey,
            label: edge.name ?? targetLabel,
            edgeId,
            variant: edgeEndVariant(edge.source, edge),
        });
    });

    return apiNodes.map((node) => {
        const key = nodeKey(node);
        const label = nodeLabels.get(key)!;
        // Only tool_request nodes show input/output port lists.
        // Dataset and collection nodes show state + badge in the body.
        const isToolRequest = node.src === "tool_request";
        // Only the expanded node shows port rows + per-port connectors; every
        // other node stays collapsed (a single merged connector per side).
        const expanded = key === expandedNodeId;
        let inputs: GraphNodePort[] = isToolRequest && expanded ? (inputPorts.get(key) ?? []) : [];
        let outputs: GraphNodePort[] = isToolRequest && expanded ? (outputPorts.get(key) ?? []) : [];
        const inputCount = inputPorts.get(key)?.length ?? 0;
        const outputCount = outputPorts.get(key)?.length ?? 0;
        const badge = resolveNodeBadge(node);

        // Collapsed tool nodes show a connection summary where the port rows would be.
        const toolSummary = isToolRequest && !expanded ? toolConnectionSummary(inputCount, outputCount) : "";

        // Expanded mode: tool nodes anchor one connector per port to its label row.
        if (expanded && isToolRequest) {
            inputs = inputs.map((p, i) => ({ ...p, offsetY: portOffsetY("input", i, inputCount) }));
            outputs = outputs.map((p, j) => ({ ...p, offsetY: portOffsetY("output", j, inputCount) }));
        }

        // Node-level (merged) connectors — one per side. Data nodes always use these;
        // tool nodes use them only in collapsed mode (expanded uses per-port connectors).
        // The variant aggregates the side's ports, so the merged connector stays
        // consistent with the edges meeting it (e.g. a collection input reads as "multiple").
        const usesNodeConnector = !isToolRequest || !expanded;
        const inputConnector = usesNodeConnector ? mergedConnectorVariant(inputPorts.get(key)) : null;
        const outputConnector = usesNodeConnector ? mergedConnectorVariant(outputPorts.get(key)) : null;

        // For datasets/collections, use state to determine icon.
        // State-based coloring is handled by data-state attribute on the node element,
        // which triggers the global $galaxy-state-bg / $galaxy-state-border rules from base.scss.
        // Collections return populated_state ("ok"/"new"/"failed") — map "failed" → "error"
        // to align with the dataset state vocabulary used by the STATES map and CSS rules.
        const rawState = node.state;
        const displayState = rawState === "failed" ? "error" : rawState;
        const stateKey = displayState as keyof typeof STATES | undefined;
        const stateRep: StateRepresentation | null =
            !isToolRequest && stateKey && stateKey in STATES ? STATES[stateKey] : null;
        const icon = stateRep?.icon ?? NODE_ICONS[node.src] ?? faFile;
        const cssClass = NODE_CSS_CLASS[node.src];

        // The node body is a stack of fixed-height rows: a tool's port rows when
        // expanded, otherwise the badge and/or state/summary lines.
        const bodyText = toolSummary || (stateRep?.text ?? null);
        const portRowCount = inputs.length + outputs.length;
        const bodyRows = portRowCount > 0 ? portRowCount : (badge ? 1 : 0) + (bodyText ? 1 : 0);
        const hasRule = inputs.length > 0 && outputs.length > 0;
        const height = computeNodeHeight(bodyRows, hasRule);
        // Merged connectors anchor at the first body row; bodyless nodes use the node center.
        const connectorY = bodyRows > 0 ? portOffsetY("input", 0, 0) : height / 2;
        return {
            id: key,
            x: 0,
            y: 0,
            width: NODE_WIDTH,
            height,
            connectorY,
            label,
            icon,
            badge,
            cssClass,
            inputs,
            outputs,
            inputConnector,
            outputConnector,
            data: {
                src: node.src,
                typeLabel: NODE_TYPE_LABELS[node.src] ?? node.src,
                /** Encoded id of the underlying item (no prefix). */
                itemId: node.id,
                toolId: isToolRequest ? node.tool_id : null,
                inputCount,
                outputCount,
                state: displayState,
                stateText: bodyText,
                stateDisplayName: stateRep?.displayName ?? null,
                stateSpin: stateRep?.spin ?? false,
            },
        };
    });
}

/**
 * Map API graph edges to generic GraphEdge[] for the renderer.
 * Points are set to empty — the layout composable fills them in.
 */
export function mapEdges(apiEdges: ApiGraphEdge[]): GraphEdge[] {
    return apiEdges.map((edge, idx) => ({
        id: `e${idx}`,
        source: nodeKey(edge.source),
        target: nodeKey(edge.target),
        cssClass: isCollectionEdge(edge) ? "edge-collection" : "edge-dataset",
        sourceVariant: edgeEndVariant(edge.source, edge),
        targetVariant: edgeEndVariant(edge.target, edge),
        points: [],
    }));
}
