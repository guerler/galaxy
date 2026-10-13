<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, toRef } from "vue";

import { useHistoryGraph } from "@/components/History/Graph/useHistoryGraph";
import { useConfig } from "@/composables/config";
import { useHistoryStore } from "@/stores/historyStore";

import GAlert from "@/components/BaseComponents/GAlert.vue";
import HistoryGraphCanvas from "@/components/History/Graph/HistoryGraphCanvas.vue";
import LoadingSpan from "@/components/LoadingSpan.vue";

const props = defineProps<{
    historyId: string;
    seedSrc?: string;
    seedId?: string;
}>();

const { loading, error, focusNodeId, graphNodes, graphEdges } = useHistoryGraph(
    toRef(props, "historyId"),
    toRef(props, "seedSrc"),
    toRef(props, "seedId"),
);

// Without SSE, only the current history is refreshed.
const { config } = useConfig();
const { currentHistoryId } = storeToRefs(useHistoryStore());
const isStatic = computed(
    () => config.value?.enable_sse_updates === false && props.historyId !== currentHistoryId.value,
);
</script>

<template>
    <GAlert v-if="error" variant="danger" show>{{ error }}</GAlert>
    <LoadingSpan v-else-if="loading" message="Loading history graph" />
    <GAlert v-else-if="graphNodes.length === 0" show variant="info" class="m-3">This history is empty.</GAlert>
    <template v-else>
        <GAlert v-if="isStatic" show variant="warning" class="m-2 py-1">
            This graph does not update automatically because live updates are disabled on this server.
        </GAlert>
        <HistoryGraphCanvas :nodes="graphNodes" :edges="graphEdges" :focus-node-id="focusNodeId" />
    </template>
</template>
