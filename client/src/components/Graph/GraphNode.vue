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
    (e: "resize", nodeId: string, size: { width: number; height: number }): void;
}>();

// The node has a fixed width but content-driven height (multiline header and
// body text). A ResizeObserver reports the rendered size so the graph layout
// can position nodes once they are all measured. observe() fires immediately,
// so the initial size is reported without any extra mount-time emit.
const root = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;

onMounted(() => {
    if (!root.value) {
        return;
    }
    observer = new ResizeObserver(() => {
        if (root.value) {
            emit("resize", props.node.id, {
                width: root.value.offsetWidth,
                height: root.value.offsetHeight,
            });
        }
    });
    observer.observe(root.value);
});

onBeforeUnmount(() => observer?.disconnect());

const nodeStyle = computed(() => ({
    left: `${props.node.x}px`,
    top: `${props.node.y}px`,
    width: `${props.node.width}px`,
}));

const stateText = computed(() => (props.node.data?.stateText as string | undefined) ?? "");
const showBody = computed(() => Boolean(props.node.badge || stateText.value));
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

// Header and body text wrap to as many lines as needed — never truncated.
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

// Merged connectors straddle the node edge at its vertical centre.
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
