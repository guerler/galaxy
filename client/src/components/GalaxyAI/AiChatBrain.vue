<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onBeforeUnmount, watch } from "vue";

import { useChatStore } from "@/stores/chatStore";

import { agentReport, commandMessage, connectMessage } from "./chatPlugin";

import PinnedVisualization from "@/components/Visualizations/PinnedVisualization.vue";

/**
 * Hosts the chat plugin in one frame for the whole page, drawn over the place that shows the chat,
 * and exchanges the messages of `chatPlugin.ts` with it.
 */
const props = defineProps<{ plugin: string }>();

const FRAME_ID = "galaxy_ai_chat";
/** How long a plugin may take to report that it is ready, in milliseconds */
const READY_TIMEOUT = 30000;

const chatStore = useChatStore();
const { agentState, chatCommands, chatConfig, chatMounts } = storeToRefs(chatStore);

const frameWindow = () => (document.getElementById(FRAME_ID) as HTMLIFrameElement | null)?.contentWindow ?? null;

/** The port to the plugin mounted last, once it is connected */
let port: MessagePort | null = null;

/**
 * Connects the plugin that reports `ready` on Galaxy's origin, once per mount. The port goes only
 * into the current frame, and reports come only over it.
 *
 * WebKit gives a message that a same-origin frame posts from a click or a timer Galaxy's own window
 * as its source (WebKit bug 163412), so that source is taken too. Another same-origin frame can then
 * at most connect the plugin's own frame early; it never receives the port.
 */
function onMessage(event: MessageEvent) {
    const frame = frameWindow();
    const fromFrame = event.source === frame || event.source === window;
    if (frame && !port && fromFrame && event.origin === window.location.origin) {
        if (agentReport(event.data)?.type === "ready") {
            const channel = new MessageChannel();
            port = channel.port1;
            port.onmessage = (message) => {
                const report = agentReport(message.data);
                if (report && report.type !== "ready") {
                    chatStore.agentReported(report);
                }
            };
            frame.postMessage(connectMessage(), window.location.origin, [channel.port2]);
            chatStore.agentReported({ type: "ready" });
        }
    }
}
window.addEventListener("message", onMessage);

/** Sends the plugin its commands, in order, once it is connected */
watch(
    [agentState, () => chatCommands.value.length],
    () => {
        if (port) {
            for (const command of chatStore.takeCommands()) {
                port.postMessage(commandMessage(command));
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
    port?.close();
    port = null;
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
    port?.close();
    window.removeEventListener("message", onMessage);
    window.removeEventListener("pagehide", onLeave);
});
</script>

<template>
    <PinnedVisualization
        :key="chatMounts"
        :name="props.plugin"
        :frame-id="FRAME_ID"
        :config="chatConfig"
        @load="onLoad" />
</template>
