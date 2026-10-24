<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onBeforeUnmount } from "vue";

import { useChatStore } from "@/stores/chatStore";

import { shownChat } from "./chatPlugin";

import PinnedVisualization from "@/components/Visualizations/PinnedVisualization.vue";

/**
 * GalaxyAI's chat: the `ai_chat_plugin` mounted once for the page, and anew for each command, as
 * `chatPlugin.ts` describes. The plugin keeps running as the chat moves between places, and draws all
 * of its own UI in its frame.
 */
const props = defineProps<{ plugin: string }>();

const FRAME_ID = "galaxy_ai_chat";

const chatStore = useChatStore();
const { chatConfig, chatMounts } = storeToRefs(chatStore);

/** Once Galaxy's page or the chat goes, its frame going after it is no reload. */
let leaving = false;
function onLeave(event: PageTransitionEvent) {
    if (!event.persisted) {
        leaving = true;
    }
}
window.addEventListener("pagehide", onLeave);
onBeforeUnmount(() => {
    leaving = true;
    window.removeEventListener("pagehide", onLeave);
});

/** A plugin page that goes while its mount stands leaves an empty frame, mounted anew. */
function onLoad() {
    const mount = chatMounts.value;
    const frame = (document.getElementById(FRAME_ID) as HTMLIFrameElement | null)?.contentWindow;
    frame?.addEventListener("pagehide", (event) => {
        if (!event.persisted && !leaving && chatMounts.value === mount) {
            chatStore.chatUnloaded();
        }
    });
}
</script>

<template>
    <PinnedVisualization
        :key="chatMounts"
        :name="props.plugin"
        :frame-id="FRAME_ID"
        :config="chatConfig"
        @change="chatStore.activeChanged(shownChat($event.visualization_config))"
        @saved="chatStore.unsavedChanged(!$event)"
        @load="onLoad" />
</template>
