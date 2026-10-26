<script setup lang="ts">
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { storeToRefs } from "pinia";
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useChatStore } from "@/stores/chatStore";

import ChatActions from "./ChatActions.vue";
import GAlert from "@/components/BaseComponents/GAlert.vue";
import Heading from "@/components/Common/Heading.vue";
import VisualizationSlot from "@/components/Visualizations/VisualizationSlot.vue";

/**
 * A place that shows the chat plugin. In the center, the address opens a saved chat or asks a
 * question, and follows the chat the plugin shows.
 */
const props = defineProps<{
    plugin: string;
    source: "docked" | "panel" | "center";
    exchangeId?: string;
    initialQuestion?: string;
}>();

const chatStore = useChatStore();
const { activeChatId, agentState } = storeToRefs(chatStore);
const route = useRoute();
const router = useRouter();

/** Returns the address of the chat the plugin shows */
const activePath = () => (activeChatId.value ? `/galaxyai/${activeChatId.value}` : "/galaxyai");

if (props.source === "center") {
    watch(
        [() => props.exchangeId, () => props.initialQuestion],
        ([exchangeId, question]) => {
            if (question) {
                // Asked once: a reload does not ask again. Declined, the address goes back.
                const asked = chatStore.askChat(question);
                router.replace(asked ? { path: route.path, query: {} } : activePath());
            } else if (exchangeId && exchangeId !== "new" && !chatStore.openChat(exchangeId)) {
                router.replace(activePath());
            }
        },
        { immediate: true },
    );

    // The address follows the chat the plugin shows, so a reload reopens it.
    watch(activeChatId, () => {
        const path = activePath();
        if (route.path !== path && !props.initialQuestion) {
            router.replace(path);
        }
    });
}

function dockTo(location: "right" | "bottom") {
    chatStore.dockChat(location);
    if (route.path.startsWith("/galaxyai")) {
        router.push("/");
    }
}
</script>

<template>
    <div class="plugin-chat" :class="`plugin-chat-${props.source}`">
        <div v-if="props.source !== 'panel'" class="plugin-chat-header">
            <Heading :icon="faMagic" :size="props.source === 'docked' ? 'sm' : 'lg'">
                <span class="heading-label">GalaxyAI</span>
            </Heading>
            <ChatActions :source="props.source" @dock-to="dockTo" />
        </div>
        <GAlert v-if="agentState === 'failed'" class="m-2" variant="danger" show>
            The AI chat did not start. Reload the page to try again. If it still does not start, ask your administrator
            to check the chat plugin.
        </GAlert>
        <div class="plugin-chat-body">
            <VisualizationSlot :name="props.plugin" />
        </div>
    </div>
</template>

<style scoped lang="scss">
@import "@/style/scss/theme/blue.scss";

.plugin-chat {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.plugin-chat-header {
    container-type: inline-size;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    row-gap: 0.375rem;
    padding: 1rem 1.25rem;
    background: $panel-bg-color;
    border-bottom: $border-default;

    :deep(.heading) {
        margin-bottom: 0;
        white-space: nowrap;
        flex-shrink: 0;
    }

    :deep(.chat-panel-actions) {
        margin-left: auto;
    }
}

.plugin-chat-docked .plugin-chat-header {
    padding: 0.5rem 0.75rem;
}

.plugin-chat-body {
    flex: 1;
    min-height: 0;
}
</style>
