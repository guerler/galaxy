<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";

import type { ConnectorVariant, GraphNode } from "./types";

import GraphConnector from "./GraphConnector.vue";

interface Props {
    node: GraphNode;
    selected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: "select", nodeId: string): void }>();

const nodeStyle = computed(() => ({
    left: `${props.node.x}px`,
    top: `${props.node.y}px`,
    width: `${props.node.width}px`,
}));

const hasInputs = computed(() => props.node.inputs && props.node.inputs.length > 0);
const hasOutputs = computed(() => props.node.outputs && props.node.outputs.length > 0);
const hasPorts = computed(() => hasInputs.value || hasOutputs.value);
const showRule = computed(() => hasInputs.value && hasOutputs.value);
const showDataBody = computed(() => !hasPorts.value && (props.node.badge || props.node.data?.stateText));
const iconSpin = computed(() => Boolean(props.node.data?.stateSpin));

interface ConnectorPlacement {
    side: "input" | "output";
    /** CSS `top` value — "50%" for merged connectors, a px offset for per-port ones. */
    top: string;
    variant: ConnectorVariant;
}

// Connectors to render: merged node-level ones (collapsed) plus per-port ones (expanded).
const connectorPlacements = computed<ConnectorPlacement[]>(() => {
    const placements: ConnectorPlacement[] = [];
    // Merged connectors anchor at the exact node center the edge routing uses.
    const centerTop = `${props.node.height / 2}px`;
    if (props.node.inputConnector) {
        placements.push({ side: "input", top: centerTop, variant: props.node.inputConnector });
    }
    if (props.node.outputConnector) {
        placements.push({ side: "output", top: centerTop, variant: props.node.outputConnector });
    }
    for (const port of props.node.inputs ?? []) {
        if (port.offsetY != null) {
            placements.push({ side: "input", top: `${port.offsetY}px`, variant: port.variant ?? "single" });
        }
    }
    for (const port of props.node.outputs ?? []) {
        if (port.offsetY != null) {
            placements.push({ side: "output", top: `${port.offsetY}px`, variant: port.variant ?? "single" });
        }
    }
    return placements;
});
</script>

<template>
    <div
        class="graph-node card"
        :class="[node.cssClass, { 'node-highlight': selected }]"
        :style="nodeStyle"
        @click.stop="emit('select', node.id)">
        <div class="graph-node-header card-header unselectable py-1 px-2" :data-state="node.data?.state ?? undefined">
            <FontAwesomeIcon :icon="node.icon" class="graph-node-icon mr-1" :spin="iconSpin" />
            <span class="graph-node-label" :title="node.label">{{ node.label }}</span>
            <span v-if="hasPorts && node.badge" class="badge badge-light ml-auto">{{ node.badge }}</span>
        </div>
        <div v-if="showDataBody" class="card-body p-0 mx-2 my-1">
            <span v-if="node.badge" class="badge badge-secondary">{{ node.badge }}</span>
            <div v-if="node.data?.stateText" class="node-state-text">{{ node.data.stateText }}</div>
        </div>
        <div v-if="hasPorts" class="node-body card-body p-0 mx-2">
            <div v-for="input in node.inputs" :key="`in-${input.name}`" class="form-row dataRow input-data-row">
                <span class="node-port-label" :title="input.label">{{ input.label }}</span>
            </div>
            <div v-if="showRule" class="rule" />
            <div v-for="output in node.outputs" :key="`out-${output.name}`" class="form-row dataRow output-data-row">
                <span class="node-port-label" :title="output.label">{{ output.label }}</span>
            </div>
        </div>
        <div
            v-for="(connector, index) in connectorPlacements"
            :key="`connector-${index}`"
            class="graph-node-connector"
            :class="`graph-node-connector--${connector.side}`"
            :style="{ top: connector.top }">
            <GraphConnector :variant="connector.variant" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.graph-node {
    position: absolute;
    cursor: pointer;
    user-select: none;
    border: solid $brand-primary 1px;
    transition:
        border-color 0.15s,
        box-shadow 0.15s,
        opacity 0.2s ease;
}

.node-highlight {
    z-index: 1001;
    border: solid $white 1px;
    box-shadow: 0 0 0 3px $brand-primary;
}

.graph-node-header {
    display: flex;
    align-items: center;
    height: 34px;
    font-size: $font-size-base;
}

.graph-node-label {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.node-body {
    font-size: $font-size-base;
}

.node-state-text {
    font-size: $h6-font-size;
    color: $text-muted;
    padding: 2px 0;
}

.form-row {
    height: 30px;
    line-height: 30px;
    padding: 0 10px;
}

.output-data-row {
    text-align: right;
}

.node-port-label {
    display: block;
    overflow: hidden;
    color: $text-color;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.rule {
    height: 5px;
    border: none;
    border-bottom: dotted $brand-primary 1px;
    margin: 0;
}

.graph-node-connector {
    position: absolute;
}

.graph-node-connector--input {
    left: 0;
    transform: translate(-50%, -50%);
}

.graph-node-connector--output {
    right: 0;
    transform: translate(50%, -50%);
}
</style>
