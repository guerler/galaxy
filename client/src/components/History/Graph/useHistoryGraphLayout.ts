import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk.bundled";
import { type Ref, ref, watch } from "vue";

import type { GraphEdge, GraphLayout, GraphNode } from "@/components/Graph/types";
import { computeControlPoints } from "@/utils/connectionPath";

import { type HistoryGraphResponse, mapEdges, mapNodes } from "./historyGraphMapper";

const elk = new ELK();

/**
 * Composable that takes API graph data and produces a positioned layout using ELK.js.
 *
 * Uses the history graph mapper to convert API types to generic graph types,
 * then runs ELK layered layout for node placement. Edges are drawn as bezier
 * curves between node ports (workflow editor style).
 *
 * `expandedNodeId` selects which node is rendered expanded (a tool node then
 * shows a connector per port); all other nodes stay collapsed.
 */
export function useHistoryGraphLayout(graphData: Ref<HistoryGraphResponse | null>, expandedNodeId: Ref<string | null>) {
    const layout = ref<GraphLayout | null>(null);
    const layoutLoading = ref(false);

    watch(
        [graphData, expandedNodeId],
        async ([data, expandedId]) => {
            if (!data || data.nodes.length === 0) {
                layout.value = null;
                return;
            }

            layoutLoading.value = true;
            try {
                layout.value = await computeLayout(data, expandedId);
            } catch (e) {
                console.error("History graph layout failed:", e);
                layout.value = null;
            } finally {
                layoutLoading.value = false;
            }
        },
        { immediate: true },
    );

    return { layout, layoutLoading };
}

/**
 * Vertical anchor (px from the node top) where an edge meets a node. Uses the
 * matching port's connector offset when present (expanded mode), else the node's
 * merged-connector row.
 */
function edgeAnchorY(
    node: GraphNode | undefined,
    side: "input" | "output",
    edgeId: string,
    nodeHeight: number,
): number {
    const ports = side === "output" ? node?.outputs : node?.inputs;
    const port = ports?.find((p) => p.edgeId === edgeId);
    if (port?.offsetY != null) {
        return port.offsetY;
    }
    return node?.connectorY ?? nodeHeight / 2;
}

async function computeLayout(data: HistoryGraphResponse, expandedNodeId: string | null): Promise<GraphLayout> {
    // Map API types to generic graph types via the history mapper
    const graphNodes = mapNodes(data.nodes, data.edges, expandedNodeId);
    const graphEdges = mapEdges(data.edges);

    // Build ELK graph
    const elkChildren: ElkNode[] = graphNodes.map((node) => ({
        id: node.id,
        width: node.width,
        height: node.height,
    }));

    const elkEdges: ElkExtendedEdge[] = graphEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
    }));

    const elkGraph: ElkNode = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",
            "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
            "elk.layered.spacing.baseValue": "80",
            "elk.spacing.nodeNode": "40",
            "elk.layered.spacing.nodeNodeBetweenLayers": "80",
        },
        children: elkChildren,
        edges: elkEdges,
    };

    const result = await elk.layout(elkGraph);

    // Apply ELK positions to graph nodes
    const nodeById = new Map(graphNodes.map((n) => [n.id, n]));
    const layoutNodes: GraphNode[] = (result.children ?? []).map((elkNode) => {
        const gn = nodeById.get(elkNode.id)!;
        return {
            ...gn,
            x: elkNode.x ?? 0,
            y: elkNode.y ?? 0,
            width: elkNode.width ?? gn.width,
            height: elkNode.height ?? gn.height,
        };
    });

    // Build node position lookup for edge routing
    const nodePositions = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of layoutNodes) {
        nodePositions.set(n.id, { x: n.x, y: n.y, w: n.width, h: n.height });
    }

    // Draw edges as bezier curves (workflow editor style). Each end anchors at its
    // per-port connector when available (expanded mode), else the node center.
    const layoutEdges: GraphEdge[] = graphEdges.map((ge) => {
        const srcNode = nodeById.get(ge.source);
        const tgtNode = nodeById.get(ge.target);
        const src = nodePositions.get(ge.source);
        const tgt = nodePositions.get(ge.target);
        let points: { x: number; y: number }[] = [];
        if (src && tgt) {
            const srcY = src.y + edgeAnchorY(srcNode, "output", ge.id, src.h);
            const tgtY = tgt.y + edgeAnchorY(tgtNode, "input", ge.id, tgt.h);
            const controlPoints = computeControlPoints(src.x + src.w, srcY, tgt.x, tgtY);
            points = controlPoints.map(([x, y]) => ({ x, y }));
        }
        return { ...ge, points };
    });

    return {
        nodes: layoutNodes,
        edges: layoutEdges,
        width: result.width ?? 0,
        height: result.height ?? 0,
    };
}
