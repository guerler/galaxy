<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import type { GraphNode } from "./types";

import GraphConnector from "./GraphConnector.vue";

interface Props {
    node: GraphNode;
    selected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    (e: "select", nodeId: string): void;
    (e: "resize", nodeId: string, size: { width: number; height: number; ports: Record<string, number> }): void;
}>();

// The node has a fixed width but content-driven height (multiline header, body
// and port rows). A ResizeObserver reports the rendered size — and, for an
// expanded node, the centre Y of each port row — so the graph layout can
// position nodes and route edges once everything is measured.
const root = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;
let lastEmitted = "";

function measure() {
    const el = root.value;
    if (!el) {
        return;
    }
    const ports: Record<string, number> = {};
    el.querySelectorAll<HTMLElement>("[data-edge-id]").forEach((portEl) => {
        const edgeId = portEl.dataset.edgeId;
        if (edgeId) {
            ports[edgeId] = portEl.offsetTop + portEl.offsetHeight / 2;
        }
    });
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const key = `${width}x${height}:${JSON.stringify(ports)}`;
    if (key === lastEmitted) {
        return;
    }
    lastEmitted = key;
    emit("resize", props.node.id, { width, height, ports });
}

onMounted(() => {
    if (!root.value) {
        return;
    }
    // observe() fires immediately, so the initial size is reported too.
    observer = new ResizeObserver(measure);
    observer.observe(root.value);
});

onBeforeUnmount(() => observer?.disconnect());

const nodeStyle = computed(() => ({
    left: `${props.node.x}px`,
    top: `${props.node.y}px`,
    width: `${props.node.width}px`,
}));

const hasInputs = computed(() => (props.node.inputs?.length ?? 0) > 0);
const hasOutputs = computed(() => (props.node.outputs?.length ?? 0) > 0);
const expanded = computed(() => hasInputs.value || hasOutputs.value);

const stateText = computed(() => (props.node.data?.stateText as string | undefined) ?? "");
const showBody = computed(() => !expanded.value && Boolean(props.node.badge || stateText.value));
const iconSpin = computed(() => Boolean(props.node.data?.stateSpin));
</script>

<template>
    <div
        ref="root"
        class="graph-node"
        :class="[node.cssClass, { 'node-highlight': selected }]"
        :style="nodeStyle"
        @click.stop="emit('select', node.id)">
        <div class="graph-node-header unselectable" :data-state="node.data?.state ?? undefined">
            <FontAwesomeIcon :icon="node.icon" class="graph-node-icon" :spin="iconSpin" fixed-width />
            <span class="graph-node-label">{{ node.label }}</span>
        </div>

        <!-- Expanded node: one row + connector per input/output port. -->
        <div v-if="expanded" class="graph-node-ports">
            <div
                v-for="port in node.inputs"
                :key="`in-${port.edgeId}`"
                class="graph-node-port graph-node-port--input"
                :data-edge-id="port.edgeId">
                <GraphConnector
                    class="graph-node-connector graph-node-connector--input"
                    :variant="port.variant ?? 'single'" />
                <span class="graph-node-port-label">{{ port.label }}</span>
            </div>
            <div v-if="hasInputs && hasOutputs" class="graph-node-rule" />
            <div
                v-for="port in node.outputs"
                :key="`out-${port.edgeId}`"
                class="graph-node-port graph-node-port--output"
                :data-edge-id="port.edgeId">
                <span class="graph-node-port-label">{{ port.label }}</span>
                <GraphConnector
                    class="graph-node-connector graph-node-connector--output"
                    :variant="port.variant ?? 'single'" />
            </div>
        </div>

        <!-- Collapsed node: badge / state / summary body, merged connectors. -->
        <template v-else>
            <div v-if="showBody" class="graph-node-body">
                <span v-if="node.badge" class="badge badge-secondary">{{ node.badge }}</span>
                <div v-if="stateText" class="graph-node-state">{{ stateText }}</div>
            </div>
            <GraphConnector
                v-if="node.inputConnector"
                class="graph-node-connector graph-node-connector--input"
                :variant="node.inputConnector" />
            <GraphConnector
                v-if="node.outputConnector"
                class="graph-node-connector graph-node-connector--output"
                :variant="node.outputConnector" />
        </template>
    </div>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.graph-node {
    position: absolute;
    background: $white;
    border: solid $brand-primary 1px;
    border-radius: 0.25rem;
    cursor: pointer;
    user-select: none;
    transition:
        border-color 0.15s,
        box-shadow 0.15s;
}

.node-highlight {
    z-index: 1001;
    border-color: $white;
    box-shadow: 0 0 0 3px $brand-primary;
}

.graph-node-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.5rem;
    font-size: $font-size-base;
}

.graph-node-icon {
    flex: none;
}

// Header, body and port text all wrap to as many lines as needed — never truncated.
.graph-node-label {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    white-space: normal;
    overflow-wrap: anywhere;
}

.graph-node-body {
    padding: 0.35rem 0.5rem;
    border-top: solid $border-color 1px;
    font-size: $font-size-base;
}

.graph-node-state {
    margin-top: 0.15rem;
    font-size: $h6-font-size;
    color: $text-muted;
    white-space: normal;
    overflow-wrap: anywhere;
}

.graph-node-ports {
    border-top: solid $border-color 1px;
    font-size: $font-size-base;
}

// position: relative anchors the row's per-port connector at its vertical centre.
.graph-node-port {
    position: relative;
    padding: 0.3rem 0.6rem;
}

.graph-node-port--output {
    text-align: right;
}

.graph-node-port-label {
    white-space: normal;
    overflow-wrap: anywhere;
}

.graph-node-rule {
    border-top: dotted $brand-primary 1px;
}

// Connectors straddle the left/right edge — of the node (merged) or of a port
// row (expanded), whichever is the connector's positioned ancestor.
.graph-node-connector {
    position: absolute;
    top: 50%;
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
