<script setup lang="ts">
import { faClock } from "@fortawesome/free-regular-svg-icons";
import { faBezierCurve, faProjectDiagram } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { BAlert, BNav, BNavItem } from "bootstrap-vue";
import { computed, ref, toRef } from "vue";

import type { EdgeStyle, GraphNode } from "@/components/Graph/types";
import { usePersistentToggle } from "@/composables/persistentToggle";
import { useHistoryStore } from "@/stores/historyStore";

import { useHistoryGraphData } from "./useHistoryGraphData";
import { useHistoryGraphLayout } from "./useHistoryGraphLayout";

import HistoryGraphOverview from "./HistoryGraphOverview.vue";
import HistoryGraphReport from "./HistoryGraphReport.vue";
import HistoryGraphToolRequests from "./HistoryGraphToolRequests.vue";
import GButton from "@/components/BaseComponents/GButton.vue";
import GButtonGroup from "@/components/BaseComponents/GButtonGroup.vue";
import NavigationTitle from "@/components/Common/NavigationTitle.vue";
import LoadingSpan from "@/components/LoadingSpan.vue";
import UtcDate from "@/components/UtcDate.vue";

interface Props {
    historyId: string;
    /** Active tab — undefined means the Overview tab (mirrors the invocation page). */
    tab?: string;
    seedSrc?: string;
    seedId?: string;
}

const props = defineProps<Props>();

// History summary — feeds the title and the collapsible info block.
const historyStore = useHistoryStore();
const history = computed(() => historyStore.getHistoryById(props.historyId));
const historyName = computed(() => history.value?.name ?? "...");

// Collapsible header info block, mirroring the invocation page's annotation.
const { toggled: headerCollapsed, toggle: toggleHeaderCollapse } = usePersistentToggle("history-graph-header-collapsed");

// Fetch params — product decisions owned here
const limit = ref(500);

const { graphData, loading, error } = useHistoryGraphData(
    toRef(props, "historyId"),
    limit,
    toRef(props, "seedSrc"),
    toRef(props, "seedId"),
);

// Renderer focus key mirrors the mapper's `${src}:${id}` node key.
const focusNodeId = computed(() => (props.seedSrc && props.seedId ? `${props.seedSrc}:${props.seedId}` : null));

// Layout
const edgeStyle = ref<EdgeStyle>("curved");
const { layout, layoutLoading } = useHistoryGraphLayout(graphData, edgeStyle);

const isLoading = computed(() => loading.value || layoutLoading.value);
const isTruncated = computed(() => graphData.value?.truncated?.item_count_capped ?? false);

// `tab` undefined means the Overview tab.
const onOverviewTab = computed(() => !props.tab);

// Tool request nodes feed the "Tool Requests" tab.
const toolRequestNodes = computed<GraphNode[]>(
    () => layout.value?.nodes.filter((n) => (n.data?.src as string) === "tool_request") ?? [],
);
</script>

<template>
    <div class="history-graph-view">
        <BAlert v-if="error" variant="danger" show>{{ error }}</BAlert>
        <LoadingSpan v-else-if="isLoading" message="Loading history graph" />
        <template v-else>
            <NavigationTitle
                :icon="faBezierCurve"
                :title="`History Graph: ${historyName}`"
                heading-description="history graph heading"
                collapsible
                :collapsed="headerCollapsed"
                @toggle="toggleHeaderCollapse">
                <template v-slot:actions>
                    <GButtonGroup v-if="onOverviewTab">
                        <GButton
                            tooltip
                            title="Orthogonal edges"
                            size="small"
                            color="blue"
                            :outline="edgeStyle !== 'orthogonal'"
                            :pressed="edgeStyle === 'orthogonal'"
                            @click="edgeStyle = 'orthogonal'">
                            <FontAwesomeIcon :icon="faProjectDiagram" fixed-width />
                        </GButton>
                        <GButton
                            tooltip
                            title="Curved edges"
                            size="small"
                            color="blue"
                            :outline="edgeStyle !== 'curved'"
                            :pressed="edgeStyle === 'curved'"
                            @click="edgeStyle = 'curved'">
                            <FontAwesomeIcon :icon="faBezierCurve" fixed-width />
                        </GButton>
                    </GButtonGroup>
                </template>
                <template v-slot:collapsible>
                    <div v-if="history" class="history-graph-info px-2 py-1 small text-muted">
                        <i data-description="history graph time info">
                            <FontAwesomeIcon :icon="faClock" class="mr-1" />
                            <span v-localize>updated</span>
                            <UtcDate :date="history.update_time" mode="elapsed" />
                        </i>
                        <span class="ml-3">{{ history.count }} items</span>
                    </div>
                </template>
            </NavigationTitle>

            <BNav pills class="mb-2 mt-2 p-2 bg-light border-bottom">
                <BNavItem title="Overview" :active="onOverviewTab" :to="`/histories/${historyId}/graph`">
                    Overview
                </BNavItem>
                <BNavItem
                    title="Tool Requests"
                    :active="props.tab === 'tool-requests'"
                    :to="`/histories/${historyId}/graph/tool-requests`">
                    Tool Requests
                </BNavItem>
                <BNavItem
                    title="AI Report"
                    :active="props.tab === 'report'"
                    :to="`/histories/${historyId}/graph/report`">
                    AI Report
                </BNavItem>
            </BNav>
            <div class="tab-content-container d-flex flex-column overflow-auto">
                <HistoryGraphOverview
                    v-if="onOverviewTab"
                    :layout="layout"
                    :focus-node-id="focusNodeId"
                    :edge-style="edgeStyle"
                    :truncated="isTruncated" />
                <HistoryGraphToolRequests v-else-if="props.tab === 'tool-requests'" :nodes="toolRequestNodes" />
                <HistoryGraphReport v-else-if="props.tab === 'report'" :history-id="historyId" />
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
.history-graph-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
}

.tab-content-container {
    flex: 1;
    min-height: 0;
}
</style>
