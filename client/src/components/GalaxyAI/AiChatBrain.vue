<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useChatStore } from "@/stores/chatStore";

import { hostBrain } from "./brain/host";
import { PANE_PATH, paneSlot } from "./pane";

import PinnedVisualization from "@/components/Visualizations/PinnedVisualization.vue";

/**
 * GalaxyAI's brain: the `ai_chat_plugin` mounted once for the page, and Galaxy's side of the brain
 * protocol with it (`brain/protocol.ts`). The plugin keeps running as the chat moves between places.
 * While the chat is docked, a brain that draws its pane apart (`chat.pane`) has it mounted too,
 * shown in the center view at `PANE_PATH`.
 */
const props = defineProps<{ plugin: string }>();

const FRAME_ID = "galaxy_ai_chat";
const PANE_FRAME_ID = "galaxy_ai_pane";
/** Tells the plugin it is mounted as the chat, so one that is also a visualization of its own can tell. */
const CHAT_CONFIG = { view: "chat" };
/** The brain's pane apart, mounted from the same plugin. */
const PANE_CONFIG = { view: "pane" };

const chatStore = useChatStore();
const { isPaneApart } = storeToRefs(chatStore);
const route = useRoute();
const router = useRouter();

/** Counts the brain's mounts: one whose page went away leaves an empty frame, mounted anew. */
const mounts = ref(0);

// Listening from setup, before the frame loads the brain, so its first message is not missed.
const host = hostBrain(() => (document.getElementById(FRAME_ID) as HTMLIFrameElement | null)?.contentWindow, {
    hostInfo: { name: "galaxy", version: "1" },
    onReady: (session) => chatStore.brainReady(session),
    onClosed: () => chatStore.brainClosed(),
    onUnloaded: () => {
        chatStore.brainUnloaded();
        mounts.value++;
    },
    onActiveChanged: ({ exchange_id }) => chatStore.activeChanged(exchange_id),
    onUnsavedChanged: ({ unsaved }) => chatStore.unsavedChanged(unsaved),
    onShowPane: () => {
        if (isPaneApart.value && route.path !== PANE_PATH) {
            router.push(PANE_PATH);
        }
    },
});

onBeforeUnmount(() => host.close());
</script>

<template>
    <PinnedVisualization :key="mounts" :name="props.plugin" :frame-id="FRAME_ID" :config="CHAT_CONFIG" />
    <PinnedVisualization
        v-if="isPaneApart"
        :name="props.plugin"
        :slot-name="paneSlot(props.plugin)"
        :frame-id="PANE_FRAME_ID"
        :config="PANE_CONFIG" />
</template>
