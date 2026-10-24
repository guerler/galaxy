<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useChatStore } from "@/stores/chatStore";

import { PANE_CONFIG, shownChat } from "./chatPlugin";
import { PANE_PATH, paneSlot } from "./pane";

import PinnedVisualization from "@/components/Visualizations/PinnedVisualization.vue";

/**
 * GalaxyAI's chat: the `ai_chat_plugin` mounted once for the page, and anew for each command, as
 * `chatPlugin.ts` describes. The plugin keeps running as the chat moves between places. While the
 * chat is docked, its pane is mounted too, shown in the center view at `PANE_PATH`.
 */
const props = defineProps<{ plugin: string }>();

const FRAME_ID = "galaxy_ai_chat";
const PANE_FRAME_ID = "galaxy_ai_pane";

const chatStore = useChatStore();
const { chatConfig, chatMounts, isPaneApart } = storeToRefs(chatStore);
const route = useRoute();
const router = useRouter();

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

function onShowPane() {
    if (isPaneApart.value && route.path !== PANE_PATH) {
        router.push(PANE_PATH);
    }
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
        @load="onLoad"
        @show-pane="onShowPane" />
    <PinnedVisualization
        v-if="isPaneApart"
        :name="props.plugin"
        :slot-name="paneSlot(props.plugin)"
        :frame-id="PANE_FRAME_ID"
        :config="PANE_CONFIG" />
</template>
