<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { visualizationSlot } from "./visualizationSlots";

import VisualizationFrame from "./VisualizationFrame.vue";

/**
 * One visualization mounted for the whole page and drawn over its current slot, so the plugin keeps
 * running as its slot moves or disappears; hidden while it has none.
 */
const props = withDefaults(defineProps<{ name: string; frameId?: string; config?: object }>(), {
    frameId: undefined,
    config: () => ({}),
});

const emit = defineEmits<{
    (e: "change", payload: Record<string, any>): void;
    (e: "saved", saved: boolean): void;
    (e: "load"): void;
}>();

interface Box {
    top: number;
    left: number;
    width: number;
    height: number;
}

const slot = visualizationSlot(props.name);
/** Where the slot is, or was last: hidden, the frame keeps its size rather than lay out for zero. */
const box = ref<Box>({ top: 0, left: 0, width: 0, height: 0 });
const visible = ref(false);

// A slot's place changes without a resize too (a neighbouring panel resized, a dock opened), so
// it is read every frame while there is one, and not at all while there is none.
let frame: number | undefined;
function follow() {
    const element = slot.value;
    const { top, left, width, height } = element?.isConnected ? element.getBoundingClientRect() : box.value;
    visible.value = !!element?.isConnected && width > 0 && height > 0;
    const last = box.value;
    if (visible.value && (last.top !== top || last.left !== left || last.width !== width || last.height !== height)) {
        box.value = { top, left, width, height };
    }
    frame = element?.isConnected ? requestAnimationFrame(follow) : undefined;
}

watch(
    slot,
    () => {
        if (frame === undefined) {
            follow();
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    if (frame !== undefined) {
        cancelAnimationFrame(frame);
    }
});

const style = computed(() => {
    const { top, left, width, height } = box.value;
    return { top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` };
});
</script>

<template>
    <div class="pinned-visualization" :class="{ 'pinned-visualization-hidden': !visible }" :style="style">
        <VisualizationFrame
            :name="name"
            :config="config"
            :frame-id="frameId"
            @change="emit('change', $event)"
            @saved="emit('saved', $event)"
            @load="emit('load')" />
    </div>
</template>

<style scoped>
.pinned-visualization {
    position: fixed;
    /* Over the page it is placed in, under Galaxy's dropdowns, modals and toasts. */
    z-index: 900;
}

.pinned-visualization-hidden {
    visibility: hidden;
    pointer-events: none;
}
</style>
