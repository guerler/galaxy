<script setup lang="ts">
import { BAlert } from "bootstrap-vue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router/composables";

import { GalaxyApi } from "@/api";

import LoadingSpan from "@/components/LoadingSpan.vue";
import VisualizationFrame from "@/components/Visualizations/VisualizationFrame.vue";

export interface Props {
    datasetId?: string;
    visualization: string;
    visualizationId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: "load"): void;
}>();

const errorMessage = ref<string>("");
const isLoading = ref<boolean>(true);
const hasUnsavedChanges = ref<boolean>(false);
const visualizationConfig = ref();

function handleLoad() {
    isLoading.value = false;
    emit("load");
}

/** The visualization reports its own edits and saves; a DOM change is not one. */
function handleChange(payload: Record<string, any>) {
    hasUnsavedChanges.value = !payload.visualization_saved;
}

function onUnload(e: BeforeUnloadEvent) {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = "";
    }
}

onBeforeRouteLeave((to, from, next) => {
    if (hasUnsavedChanges.value && !window.confirm("Unsaved changes will be lost. Continue?")) {
        next(false);
    } else {
        next();
    }
});

onMounted(async () => {
    if (props.visualizationId) {
        const { data, error } = await GalaxyApi().GET("/api/visualizations/{id}", {
            params: { path: { id: props.visualizationId } },
        });
        if (error) {
            errorMessage.value = error.err_msg;
        } else if (data?.latest_revision?.config) {
            visualizationConfig.value = data.latest_revision.config;
            errorMessage.value = "";
        } else {
            errorMessage.value = "Failed to access visualization details.";
        }
    } else {
        visualizationConfig.value = { dataset_id: props.datasetId };
    }

    window.addEventListener("beforeunload", onUnload);
});

// Registered on the window, so leaving without this keeps warning for a destroyed component.
onBeforeUnmount(() => window.removeEventListener("beforeunload", onUnload));
</script>

<template>
    <div class="position-relative h-100 overflow-hidden">
        <BAlert v-if="errorMessage" variant="danger" show>
            {{ errorMessage }}
        </BAlert>
        <div v-else-if="isLoading" class="iframe-loading bg-light">
            <LoadingSpan message="Loading visualization" />
        </div>

        <VisualizationFrame
            v-if="visualizationConfig"
            :config="visualizationConfig"
            :name="props.visualization"
            @change="handleChange"
            @load="handleLoad" />
    </div>
</template>
