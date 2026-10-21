<script setup lang="ts">
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { useRoute, useRouter } from "vue-router";

import { useChatStore } from "@/stores/chatStore";

import ChatActions from "./ChatActions.vue";
import Heading from "@/components/Common/Heading.vue";
import VisualizationSlot from "@/components/Visualizations/VisualizationSlot.vue";

/**
 * A place for the chat plugin. The plugin keeps its conversations, so the header only places it and
 * opens the chat list; the bottom panel draws its own header.
 */
const props = defineProps<{ plugin: string; source: "docked" | "panel" | "center" }>();

const chatStore = useChatStore();
const route = useRoute();
const router = useRouter();

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
