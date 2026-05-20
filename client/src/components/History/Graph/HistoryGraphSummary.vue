<script setup lang="ts">
import { faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { BAlert } from "bootstrap-vue";
import { computed, onMounted, ref } from "vue";

import { GalaxyApi } from "@/api";
import { useMarkdown } from "@/composables/markdown";

import GButton from "@/components/BaseComponents/GButton.vue";
import Heading from "@/components/Common/Heading.vue";
import LoadingSpan from "@/components/LoadingSpan.vue";

const { renderMarkdown } = useMarkdown({ openLinksInNewPage: true });

interface Props {
    historyId: string;
    seed?: string;
}

const props = defineProps<Props>();

const loading = ref(false);
const errorMsg = ref<string | null>(null);
const summary = ref<string | null>(null);

async function fetchSummary() {
    loading.value = true;
    errorMsg.value = null;
    try {
        const body: { history_id: string; seed?: string; direction?: "backward" | "forward" | "both" } = {
            history_id: props.historyId,
        };
        if (props.seed) {
            body.seed = props.seed;
            body.direction = "backward";
        }
        const { data, error } = await GalaxyApi().POST("/api/ai/agents/history-summary", { body });
        if (error) {
            errorMsg.value = error.err_msg ?? "Failed to fetch summary.";
            summary.value = null;
        } else {
            summary.value = data?.content ?? null;
            if (!summary.value) {
                errorMsg.value = "The agent returned an empty response.";
            }
        }
    } catch (e: unknown) {
        errorMsg.value = e instanceof Error ? e.message : "Failed to fetch summary.";
    } finally {
        loading.value = false;
    }
}

const summaryHtml = computed(() => (summary.value ? renderMarkdown(summary.value) : ""));

onMounted(() => {
    fetchSummary();
});
</script>

<template>
    <div class="history-graph-summary">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <Heading h2 inline bold size="text">Summary</Heading>
            <GButton tooltip title="Regenerate summary" size="small" :disabled="loading" @click="fetchSummary">
                <FontAwesomeIcon :icon="faSyncAlt" fixed-width />
            </GButton>
        </div>
        <LoadingSpan v-if="loading" message="Generating summary" />
        <BAlert v-else-if="errorMsg" variant="danger" show>{{ errorMsg }}</BAlert>
        <div v-else-if="summary" class="summary-markdown" v-html="summaryHtml" />
    </div>
</template>

<style lang="scss" scoped>
.history-graph-summary {
    padding: 0.5rem;
}

.summary-markdown {
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
