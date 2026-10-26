<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { visualizationSlot } from "./visualizationSlots";

import VisualizationFrame from "./VisualizationFrame.vue";

/**
 * One visualization mounted for the whole page once its first slot shows, and drawn over its current
 * slot, so the plugin keeps running as its slot moves or disappears; hidden while it has none.
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
/** Whether a slot has shown it yet; a page that never shows it never loads the plugin. */
const placed = ref(false);

let observer: ResizeObserver | undefined;
function place() {
    const element = slot.value;
    const { top, left, width, height } = element?.isConnected ? element.getBoundingClientRect() : box.value;
    visible.value = !!element?.isConnected && width > 0 && height > 0;
    const last = box.value;
    if (visible.value && (last.top !== top || last.left !== left || last.width !== width || last.height !== height)) {
        box.value = { top, left, width, height };
    }
}

watch(
    slot,
    (element) => {
        if (element) {
            placed.value = true;
        }
        observer?.disconnect();
        observer = undefined;
        if (element) {
            observer = new ResizeObserver(place);
            observer.observe(element);
        }
        place();
    },
    { immediate: true },
);

window.addEventListener("resize", place);
window.addEventListener("scroll", place, { capture: true, passive: true });

onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, { capture: true });
});

const style = computed(() => {
    const { top, left, width, height } = box.value;
    return { top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` };
});
</script>

<template>
    <div class="pinned-visualization" :class="{ 'pinned-visualization-hidden': !visible }" :style="style">
        <VisualizationFrame
            v-if="placed"
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
