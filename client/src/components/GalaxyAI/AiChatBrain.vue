<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

import { useChatStore } from "@/stores/chatStore";

import { hostBrain } from "./brain/host";

import PinnedVisualization from "@/components/Visualizations/PinnedVisualization.vue";

/**
 * GalaxyAI's brain: the `ai_chat_plugin` mounted once for the page, and Galaxy's side of the brain
 * protocol with it (`brain/protocol.ts`). The plugin keeps running as the chat moves between places.
 */
const props = defineProps<{ plugin: string }>();

const FRAME_ID = "galaxy_ai_chat";

const chatStore = useChatStore();

/** Counts the brain's mounts: one whose page went away leaves an empty frame, mounted anew. */
const mounts = ref(0);

// Listening from setup, before the frame loads the brain, so its first message is not missed.
const host = hostBrain(() => (document.getElementById(FRAME_ID) as HTMLIFrameElement | null)?.contentWindow, {
    hostInfo: { name: "galaxy", version: "1" },
    onReady: (session) => chatStore.brainReady(session),
    onClosed: () => chatStore.brainClosed(),
    onUnloaded: () => mounts.value++,
    onActiveChanged: ({ exchange_id }) => chatStore.activeChanged(exchange_id),
});

onBeforeUnmount(() => host.close());
</script>

<template>
    <PinnedVisualization :key="mounts" :name="props.plugin" :frame-id="FRAME_ID" />
</template>
