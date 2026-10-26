<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import { claimVisualizationSlot } from "./visualizationSlots";

/** Marks where the pinned visualization `name` shows; it is drawn over this element. */
const props = defineProps<{ name: string }>();

const element = ref<HTMLElement | null>(null);
let release: (() => void) | undefined;

onMounted(() => {
    release = claimVisualizationSlot(props.name, element.value!);
});

onBeforeUnmount(() => release?.());
</script>

<template>
    <div ref="element" class="visualization-slot h-100 w-100" :data-visualization="name" />
</template>
