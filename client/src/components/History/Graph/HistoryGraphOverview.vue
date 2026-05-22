<script setup lang="ts">
import { faProjectDiagram } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { BAlert } from "bootstrap-vue";
import { computed, ref, watch } from "vue";

import type { GraphEdge, GraphNode } from "@/components/Graph/types";

import { historyNodeColor } from "./historyNodeColor";

import HistoryGraphNodeDetails from "./HistoryGraphNodeDetails.vue";
import GButton from "@/components/BaseComponents/GButton.vue";
import GraphView from "@/components/Graph/GraphView.vue";

interface Props {
    nodes: GraphNode[];
    edges: GraphEdge[];
    focusNodeId?: string | null;
    truncated?: boolean;
}

withDefaults(defineProps<Props>(), {
    focusNodeId: null,
    truncated: false,
});

const emit = defineEmits<{
    (e: "expand", nodeId: string | null): void;
}>();

// Selected graph node — its details render in the card below the graph,
// mirroring the workflow invocation overview (graph + step card).
const selectedNode = ref<GraphNode | null>(null);

function onNodeSelected(node: GraphNode | null) {
    selectedNode.value = node;
}

// "Show Connections" expands the focused tool node only — like the invocation graph.
const showConnections = ref(false);
const selectedIsTool = computed(() => (selectedNode.value?.data?.src as string) === "tool_request");
const expandedNodeId = computed(() =>
    showConnections.value && selectedNode.value && selectedIsTool.value ? selectedNode.value.id : null,
);

watch(expandedNodeId, (id) => emit("expand", id));
</script>

<template>
    <div class="history-graph-overview">
        <div class="graph-pane rounded border">
            <GraphView
                :nodes="nodes"
                :edges="edges"
                :focus-node-id="focusNodeId"
                :node-color="historyNodeColor"
                center-on-select
                show-scroll-overlays
                @nodeSelected="onNodeSelected" />
            <GButton
                v-if="selectedIsTool"
                class="show-connections-button"
                tooltip
                :title="showConnections ? 'Hide tool connections' : 'Show tool connections'"
                size="small"
                color="blue"
                :pressed="showConnections"
                @click="showConnections = !showConnections">
                <FontAwesomeIcon :icon="faProjectDiagram" fixed-width />
                Show Connections
            </GButton>
        </div>
        <BAlert v-if="truncated" variant="warning" show class="mt-2 mb-0 py-1 text-center">
            Showing a partial graph. Not all connections are visible.
        </BAlert>
        <HistoryGraphNodeDetails class="mt-2" :node="selectedNode" />
    </div>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.graph-pane {
    position: relative;
    display: flex;
    height: 60vh;
    min-height: 400px;
}

.show-connections-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Tool request nodes use the primary header colour (no dataset state). */
:deep(.node-tool-request) .graph-node-header {
    background: $brand-primary;
    color: $white;
}

/* Dataset/collection node headers use state-driven colouring via data-state. */
:deep(.node-dataset) .graph-node-header,
:deep(.node-collection) .graph-node-header {
    color: $text-color;
}
</style>
