<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onBeforeUnmount, watch } from "vue";

import { useChatStore } from "@/stores/chatStore";

import { activeChat, commandMessage } from "./chatPlugin";

import PinnedVisualization from "@/components/Visualizations/PinnedVisualization.vue";

/**
 * Hosts the chat plugin in one frame for the whole page, drawn over the place that shows the chat, takes
 * its Charts messages and sends it the commands of `chatPlugin.ts`.
 */
const props = defineProps<{ plugin: string }>();

const FRAME_ID = "galaxy_ai_chat";
/** How long a plugin may take to send its first message, in milliseconds */
const READY_TIMEOUT = 30000;

const chatStore = useChatStore();
const { agentState, chatCommands, chatConfig, chatMounts } = storeToRefs(chatStore);

const frameWindow = () => (document.getElementById(FRAME_ID) as HTMLIFrameElement | null)?.contentWindow ?? null;

/** The plugin mounted last takes commands once it sends its first message */
function onMessage() {
    if (agentState.value !== "ready") {
        chatStore.agentReported({ type: "ready" });
    }
}

function onSaved(saved: boolean) {
    onMessage();
    chatStore.agentReported({ type: "unsaved", value: !saved });
}

function onChange(message: Record<string, any>) {
    onMessage();
    const exchangeId = activeChat(message.visualization_config);
    if (exchangeId !== undefined) {
        chatStore.agentReported({ type: "active", exchange_id: exchangeId });
    }
}

/** Sends the plugin its commands, in order, into its frame at Galaxy's origin, once it is ready */
watch(
    [agentState, () => chatCommands.value.length],
    () => {
        const frame = frameWindow();
        if (frame) {
            for (const command of chatStore.takeCommands()) {
                frame.postMessage(commandMessage(command), window.location.origin);
            }
        }
    },
    { flush: "sync" },
);

/** Once Galaxy's page or the chat goes, its frame going after it is no reload */
let leaving = false;
function onLeave(event: PageTransitionEvent) {
    if (!event.persisted) {
        leaving = true;
    }
}
window.addEventListener("pagehide", onLeave);

let readyTimer: ReturnType<typeof setTimeout> | undefined;

/** Watches the plugin mounted last: it must report ready in time, and its page must not go */
function onLoad() {
    chatStore.agentLoaded();
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => chatStore.agentSilent(), READY_TIMEOUT);
    const mount = chatMounts.value;
    frameWindow()?.addEventListener("pagehide", (event) => {
        if (!event.persisted && !leaving && chatMounts.value === mount) {
            chatStore.chatUnloaded();
        }
    });
}

onBeforeUnmount(() => {
    leaving = true;
    clearTimeout(readyTimer);
    window.removeEventListener("pagehide", onLeave);
});
</script>

<template>
    <PinnedVisualization
        :key="chatMounts"
        :name="props.plugin"
        :frame-id="FRAME_ID"
        :config="chatConfig"
        @change="onChange"
        @saved="onSaved"
        @load="onLoad" />
</template>
