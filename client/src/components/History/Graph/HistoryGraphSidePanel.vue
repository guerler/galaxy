<script setup lang="ts">
import { ref } from "vue";

import type { GraphNode } from "@/components/Graph/types";

import HistoryGraphDetails from "./HistoryGraphDetails.vue";
import HistoryGraphSummary from "./HistoryGraphSummary.vue";

interface Props {
    historyId: string;
    selectedNode: GraphNode | null;
    seed?: string;
}

const props = defineProps<Props>();

type Tab = "details" | "summary";
const activeTab = ref<Tab>("details");

// Mount Summary lazily on first activation so its onMounted fetch only fires
// when the user actually opens the tab. After first activation v-show keeps it
// alive so the cached narrative survives subsequent tab switches.
const summaryEverActivated = ref(false);

function selectTab(tab: Tab) {
    activeTab.value = tab;
    if (tab === "summary") {
        summaryEverActivated.value = true;
    }
}
</script>

<template>
    <div class="history-graph-side-panel">
        <div class="tab-strip" role="tablist">
            <button
                :class="['tab-button', { active: activeTab === 'details' }]"
                role="tab"
                :aria-selected="activeTab === 'details'"
                @click="selectTab('details')">
                Details
            </button>
            <button
                :class="['tab-button', { active: activeTab === 'summary' }]"
                role="tab"
                :aria-selected="activeTab === 'summary'"
                @click="selectTab('summary')">
                Summary
            </button>
        </div>
        <div class="tab-content">
            <div v-show="activeTab === 'details'" class="tab-pane">
                <HistoryGraphDetails v-if="props.selectedNode" :node="props.selectedNode" />
                <div v-else class="empty-state">Select a node to see its details.</div>
            </div>
            <div v-if="summaryEverActivated" v-show="activeTab === 'summary'" class="tab-pane">
                <HistoryGraphSummary :history-id="props.historyId" :seed="props.seed" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.history-graph-side-panel {
    display: flex;
    flex-direction: column;
    width: 360px;
    min-width: 360px;
    border-left: 1px solid $border-color;
    background: $white;
}

.tab-strip {
    display: flex;
    border-bottom: 1px solid $border-color;
    background: $brand-light;
}

.tab-button {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 0;
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
    color: $text-color;
    border-bottom: 2px solid transparent;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
    }

    &.active {
        background: $white;
        border-bottom-color: $brand-primary;
        font-weight: 600;
    }
}

.tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.tab-pane {
    height: 100%;
}

.empty-state {
    padding: 1rem;
    color: $text-muted;
    font-style: italic;
}
</style>
