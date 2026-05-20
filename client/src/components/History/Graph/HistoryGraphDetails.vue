<script setup lang="ts">
import { BAlert } from "bootstrap-vue";
import { computed, ref, watch } from "vue";

import { GalaxyApi } from "@/api";
import type { GraphNode } from "@/components/Graph/types";
import { useMarkdown } from "@/composables/markdown";

import Heading from "@/components/Common/Heading.vue";
import GenericHistoryItem from "@/components/History/Content/GenericItem.vue";
import JobInformation from "@/components/JobInformation/JobInformation.vue";
import LoadingSpan from "@/components/LoadingSpan.vue";

interface Props {
    historyId: string;
    node: GraphNode;
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

// AI narrative — per-node "how was this made" summary.
// Cached for the component's lifetime so re-clicking a node doesn't re-fetch.
const narrativeCache = new Map<string, string>();
const narrativeLoading = ref(false);
const narrativeError = ref<string | null>(null);
const narrative = ref<string | null>(null);

watch(
    () => props.node?.id ?? null,
    async (nodeId) => {
        narrative.value = null;
        narrativeError.value = null;
        if (!nodeId) {
            return;
        }
        const cached = narrativeCache.get(nodeId);
        if (cached !== undefined) {
            narrative.value = cached;
            return;
        }
        narrativeLoading.value = true;
        try {
            const { data, error } = await GalaxyApi().POST("/api/ai/agents/history-summary", {
                body: { history_id: props.historyId, seed: nodeId, direction: "backward" },
            });
            if (error) {
                narrativeError.value = error.err_msg ?? "Failed to fetch narrative.";
            } else {
                const text = data?.content ?? "";
                narrativeCache.set(nodeId, text);
                narrative.value = text;
            }
        } catch (e) {
            narrativeError.value = e instanceof Error ? e.message : "Failed to fetch narrative.";
        } finally {
            narrativeLoading.value = false;
        }
    },
    { immediate: true },
);

const narrativeHtml = computed(() => (narrative.value ? renderMarkdown(narrative.value) : ""));
</script>

<template>
    <div class="history-graph-details border-left bg-white">
        <div class="details-body">
            <!-- Dataset or Collection -->
            <div v-if="itemSrc && itemId" :key="itemId" class="p-2">
                <Heading h1 separator inline size="md">
                    {{ nodeSrc === "hda" ? "Dataset Information" : "Collection Information" }}
                </Heading>
                <GenericHistoryItem :item-id="itemId" :item-src="itemSrc" />
            </div>

            <!-- Tool request / Job details -->
            <div v-else-if="nodeSrc === 'tool_request'" class="p-2">
                <LoadingSpan v-if="jobLoading" message="Loading job details" />
                <BAlert v-else-if="jobError" variant="info" show class="mb-0">{{ jobError }}</BAlert>
                <JobInformation v-else-if="jobId" :job-id="jobId" :include-times="true" />
            </div>

            <!-- AI narrative for the selected node -->
            <div class="p-2 narrative-section">
                <Heading h2 separator inline size="sm">Provenance</Heading>
                <LoadingSpan v-if="narrativeLoading" message="Generating provenance narrative" />
                <BAlert v-else-if="narrativeError" variant="info" show class="mb-0">{{ narrativeError }}</BAlert>
                <div v-else-if="narrative" class="narrative-text" v-html="narrativeHtml" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.history-graph-details {
    flex-shrink: 0;
    width: 320px;
    height: 100%;
    overflow-y: auto;
}

.narrative-section {
    margin-top: 0.5rem;
}

.narrative-text {
    font-size: 0.9rem;
    line-height: 1.4;

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
