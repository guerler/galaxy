<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import type { MarkdownConfig } from "./types";

import Markdown from "./Markdown.vue";

const props = defineProps<{
    content?: string;
}>();

const HOST = "galaxy-embed-host";
const SELF = "galaxy-embed";

const content = ref(props.content ?? "");

const markdownConfig = computed<MarkdownConfig>(() => ({ content: content.value }));

/** Same-origin only: the embedder and this frame are both served by Galaxy. */
function onMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin || event.data?.from !== HOST) {
        return;
    }
    if (event.data.type === "content" && typeof event.data.content === "string") {
        content.value = event.data.content;
    }
}

onMounted(() => {
    window.addEventListener("message", onMessage);
    if (window.parent !== window) {
        window.parent.postMessage({ from: SELF, type: "ready" }, window.location.origin);
    }
});

onBeforeUnmount(() => window.removeEventListener("message", onMessage));
</script>

<template>
    <Markdown :markdown-config="markdownConfig" read-only no-heading download-endpoint="" />
</template>
