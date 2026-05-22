<script setup lang="ts">
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useElementBounding } from "@vueuse/core";
import { computed, nextTick, type Ref, ref, watch } from "vue";

import { useD3Zoom } from "@/composables/d3Zoom";
import { useViewportBoundingBox } from "@/composables/viewportBoundingBox";
import { maxZoom, minZoom } from "@/utils/zoomLevels";

import { layoutGraph } from "./layoutGraph";
import type { GraphEdge, GraphLayout, GraphNode } from "./types";

import GraphEdges from "./GraphEdges.vue";
import GraphMinimap from "./GraphMinimap.vue";
import GraphNodeComponent from "./GraphNode.vue";
import ZoomControl from "./ZoomControl.vue";

interface Props {
    /** Graph structure — each node carries its content and a fixed width; the
     *  view measures the rendered height, then positions everything with ELK. */
    nodes: GraphNode[];
    edges: GraphEdge[];
    focusNodeId?: string | null;
    showZoomControls?: boolean;
    showMinimap?: boolean;
    nodeColor?: (node: GraphNode) => string | null | undefined;
    centerOnSelect?: boolean;
    showScrollOverlays?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    focusNodeId: null,
    showZoomControls: true,
    showMinimap: true,
    nodeColor: undefined,
    centerOnSelect: false,
    showScrollOverlays: false,
});

const emit = defineEmits<{ (e: "nodeSelected", node: GraphNode | null): void }>();

// ── Measure-then-layout ──────────────────────────────────────────────
// Nodes render hidden first so the browser computes their wrapped height;
// once every node has reported a size, ELK positions them and the graph is
// revealed. Node widths stay fixed while text wraps to as many lines as needed.
const measuredSizes = ref(new Map<string, { width: number; height: number }>());
const layout = ref<GraphLayout | null>(null);
const measuring = computed(() => layout.value === null && props.nodes.length > 0);

function onNodeResize(id: string, size: { width: number; height: number }) {
    const next = new Map(measuredSizes.value);
    next.set(id, size);
    measuredSizes.value = next;
}

let layoutScheduled = false;
function scheduleLayout() {
    if (layoutScheduled) {
        return;
    }
    layoutScheduled = true;
    requestAnimationFrame(() => {
        layoutScheduled = false;
        void runLayout();
    });
}

let layoutToken = 0;
async function runLayout() {
    const token = ++layoutToken;
    const sized = props.nodes.map((node) => ({
        ...node,
        height: measuredSizes.value.get(node.id)?.height ?? node.height,
    }));
    const result = await layoutGraph(sized, props.edges);
    if (token !== layoutToken) {
        return; // superseded by a newer run
    }
    layout.value = result;
    await nextTick();
    fitView();
}

// A new graph structure drops the stale layout so it re-measures and re-runs.
watch(
    () => props.nodes,
    () => {
        layout.value = null;
    },
);

// Run layout once every current node has reported a measured size.
watch(
    [measuredSizes, () => props.nodes],
    () => {
        if (props.nodes.length > 0 && props.nodes.every((node) => measuredSizes.value.has(node.id))) {
            scheduleLayout();
        }
    },
    { immediate: true },
);

// ── Zoom / pan ───────────────────────────────────────────────────────
const scale = ref(1);
const canvasContainer: Ref<HTMLElement | null> = ref(null);
const { transform, setZoom, panBy, moveTo } = useD3Zoom(1, minZoom, maxZoom, canvasContainer, { x: 50, y: 50 });
const elementBounding = useElementBounding(canvasContainer, { windowResize: false, windowScroll: false });
const { viewportBoundingBox } = useViewportBoundingBox(elementBounding, scale, transform);

watch(
    () => transform.value.k,
    (k) => {
        scale.value = k;
    },
);

function onZoom(zoomLevel: number) {
    setZoom(zoomLevel);
}

const canvasStyle = computed(() => ({
    transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.k})`,
}));

// ── Fit to view ──────────────────────────────────────────────────────
function fitView() {
    const current = layout.value;
    if (!current || current.nodes.length === 0) {
        return;
    }
    const focusNode = props.focusNodeId ? current.nodes.find((node) => node.id === props.focusNodeId) : null;
    if (focusNode) {
        moveTo({ x: focusNode.x + focusNode.width / 2, y: focusNode.y + focusNode.height / 2 });
        return;
    }
    const viewWidth = elementBounding.width.value;
    const viewHeight = elementBounding.height.value;
    if (viewWidth > 0 && viewHeight > 0 && current.width > 0 && current.height > 0) {
        const padding = 40;
        const fit = Math.min((viewWidth - padding) / current.width, (viewHeight - padding) / current.height);
        setZoom(Math.max(minZoom, Math.min(1, fit)));
    }
    moveTo({ x: current.width / 2, y: current.height / 2 });
}

// ── Selection ────────────────────────────────────────────────────────
const selectedNodeId = ref<string | null>(null);

function onNodeSelect(nodeId: string) {
    if (selectedNodeId.value === nodeId) {
        selectedNodeId.value = null;
        emit("nodeSelected", null);
        return;
    }
    selectedNodeId.value = nodeId;
    const node = layout.value?.nodes.find((candidate) => candidate.id === nodeId) ?? null;
    emit("nodeSelected", node);
    if (props.centerOnSelect && node) {
        moveTo({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
    }
}

const mouseMovementThreshold = 9;
let pointerDownPos: { x: number; y: number } | null = null;

function onPointerDown(e: PointerEvent) {
    pointerDownPos = { x: e.clientX, y: e.clientY };
}

function onPointerUp(e: PointerEvent) {
    if (!pointerDownPos) {
        return;
    }
    const moved = Math.abs(e.clientX - pointerDownPos.x) + Math.abs(e.clientY - pointerDownPos.y);
    pointerDownPos = null;
    if (moved <= mouseMovementThreshold && !(e.target as HTMLElement).closest(".graph-node")) {
        selectedNodeId.value = null;
        emit("nodeSelected", null);
    }
}

// Positioned nodes once laid out; before that, the raw nodes (stacked at the
// origin, hidden) purely so they can be measured.
const renderNodes = computed<GraphNode[]>(() => layout.value?.nodes ?? props.nodes);
</script>

<template>
    <div class="graph-canvas rounded">
        <ZoomControl v-if="showZoomControls && layout" :zoom-level="scale" @onZoom="onZoom" />
        <div ref="canvasContainer" class="canvas-container" @pointerdown="onPointerDown" @pointerup="onPointerUp">
            <div class="graph-node-area" :class="{ measuring }" :style="canvasStyle">
                <GraphEdges
                    v-if="layout"
                    :edges="layout.edges"
                    :selected-node-id="selectedNodeId"
                    :width="layout.width + 200"
                    :height="layout.height + 200" />
                <GraphNodeComponent
                    v-for="node in renderNodes"
                    :key="node.id"
                    :node="node"
                    :selected="node.id === selectedNodeId"
                    @select="onNodeSelect"
                    @resize="onNodeResize" />
            </div>
            <div v-if="measuring" class="graph-loading">
                <FontAwesomeIcon :icon="faSpinner" spin size="2x" />
            </div>
        </div>
        <div v-if="showScrollOverlays" class="graph-scroll-overlay overlay-left" />
        <div v-if="showScrollOverlays" class="graph-scroll-overlay overlay-right" />
        <GraphMinimap
            v-if="showMinimap && layout"
            :layout="layout"
            :viewport-bounding-box="viewportBoundingBox"
            :selected-node-id="selectedNodeId"
            :node-color="nodeColor"
            :parent-right="elementBounding.right.value"
            :parent-bottom="elementBounding.bottom.value"
            @panBy="panBy"
            @moveTo="moveTo" />
    </div>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.graph-canvas {
    flex: 1;
    width: 100%;
    position: relative;
    overflow: hidden;
}

.canvas-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: $white;
}

.graph-node-area {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;

    // While measuring, nodes are rendered (so they can be sized) but hidden.
    &.measuring {
        visibility: hidden;
    }
}

.graph-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-muted;
}

.graph-scroll-overlay {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.5rem;
    background: $gray-200;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 1;

    &.overlay-left {
        left: 0;
    }

    &.overlay-right {
        right: 0;
    }
}

.graph-canvas:hover .graph-scroll-overlay {
    opacity: 0.5;
    pointer-events: auto;
}
</style>
