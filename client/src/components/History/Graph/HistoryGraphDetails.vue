<script setup lang="ts">
import { BAlert } from "bootstrap-vue";
import { computed, onMounted, ref, watch } from "vue";

import { GalaxyApi } from "@/api";
import type { GraphNode } from "@/components/Graph/types";
import { useMarkdown } from "@/composables/markdown";

import Heading from "@/components/Common/Heading.vue";
import GenericHistoryItem from "@/components/History/Content/GenericItem.vue";
import JobInformation from "@/components/JobInformation/JobInformation.vue";
import LoadingSpan from "@/components/LoadingSpan.vue";

interface Props {
    historyId: string;
    node: GraphNode | null;
}

const props = defineProps<Props>();

const { renderMarkdown } = useMarkdown({ openLinksInNewPage: true });

const nodeSrc = computed(() => (props.node?.data?.src as string) ?? null);
const itemId = computed(() => (props.node?.data?.itemId as string) ?? null);

/** src GenericHistoryItem expects, for the item node kinds it can render */
const itemSrc = computed(() => {
    if (nodeSrc.value === "hda" || nodeSrc.value === "hdca") {
        return nodeSrc.value;
    }
    return null;
});

// Tool request -> job ID resolution
const jobId = ref<string | null>(null);
const jobLoading = ref(false);
const jobError = ref<string | null>(null);

watch(
    () => [nodeSrc.value, itemId.value],
    async ([src, id]) => {
        jobId.value = null;
        jobError.value = null;
        if (src !== "tool_request" || !id) {
            return;
        }
        jobLoading.value = true;
        try {
            const { data, error } = await GalaxyApi().GET("/api/tool_requests/{id}", {
                params: { path: { id: id as string } },
            });
            if (error) {
                jobError.value = "Failed to load tool request details.";
            } else if (data.jobs && data.jobs.length > 0) {
                jobId.value = data.jobs[0]!.id;
            } else {
                jobError.value = "No job associated with this tool execution.";
            }
        } catch (e) {
            jobError.value = "Failed to load tool request details.";
        } finally {
            jobLoading.value = false;
        }
    },
    { immediate: true },
);

// Comprehensive history-wide analysis report. Generated once per panel
// mount, shown regardless of which node (if any) is selected.
const reportLoading = ref(false);
const reportError = ref<string | null>(null);
const report = ref<string | null>(null);

async function loadReport() {
    reportLoading.value = true;
    reportError.value = null;
    try {
        const { data, error } = await GalaxyApi().POST("/api/ai/agents/history-summary", {
            body: { history_id: props.historyId },
        });
        if (error) {
            reportError.value = error.err_msg ?? "Failed to generate report.";
        } else {
            report.value = data?.content ?? "";
        }
    } catch (e) {
        reportError.value = e instanceof Error ? e.message : "Failed to generate report.";
    } finally {
        reportLoading.value = false;
    }
}

onMounted(loadReport);

const reportHtml = computed(() => (report.value ? renderMarkdown(report.value) : ""));
</script>

<template>
    <div class="history-graph-details border-left bg-white">
        <div class="details-body">
            <!-- Node-specific details when a node is selected -->
            <div v-if="itemSrc && itemId" :key="itemId" class="p-2">
                <Heading h1 separator inline size="md">
                    {{ nodeSrc === "hda" ? "Dataset Information" : "Collection Information" }}
                </Heading>
                <GenericHistoryItem :item-id="itemId" :item-src="itemSrc" />
            </div>

            <div v-else-if="nodeSrc === 'tool_request'" class="p-2">
                <Heading h1 separator inline size="md">Job Information</Heading>
                <LoadingSpan v-if="jobLoading" message="Loading job details" />
                <BAlert v-else-if="jobError" variant="info" show class="mb-0">{{ jobError }}</BAlert>
                <JobInformation v-else-if="jobId" :job-id="jobId" :include-times="true" />
            </div>

            <!-- Comprehensive analysis report (history-wide; same regardless of selection) -->
            <div class="p-2 report-section">
                <Heading h1 separator inline size="md">Analysis Report</Heading>
                <LoadingSpan v-if="reportLoading" message="Generating analysis report" />
                <BAlert v-else-if="reportError" variant="info" show class="mb-0">{{ reportError }}</BAlert>
                <div v-else-if="report" class="report-text" v-html="reportHtml" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.history-graph-details {
    flex-shrink: 0;
    width: 360px;
    height: 100%;
    overflow-y: auto;
}

.report-section {
    margin-bottom: 0.5rem;
}

.report-text {
    font-size: 0.9rem;
    line-height: 1.4;

    :deep(h2) {
        font-size: 1rem;
        font-weight: 600;
        margin-top: 0.75rem;
        margin-bottom: 0.25rem;
    }
    :deep(p) {
        margin-bottom: 0.5rem;
    }
    :deep(ul),
    :deep(ol) {
        margin-bottom: 0.5rem;
        padding-left: 1.25rem;
    }
    :deep(code) {
        font-size: 0.85em;
    }
}
</style>
