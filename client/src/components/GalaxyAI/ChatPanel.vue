<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useChatStore } from "@/stores/chatStore";

import ChatActions from "./ChatActions.vue";
import PluginChat from "./PluginChat.vue";

/** The bottom panel's chat. */
const props = defineProps<{ plugin: string }>();

const chatStore = useChatStore();
const { activeChatId } = storeToRefs(chatStore);

const route = useRoute();
const router = useRouter();

const collapsed = ref(false);

function dockTo(location: "right" | "bottom") {
    chatStore.dockChat(location);
    if (route.path.startsWith("/galaxyai")) {
        router.push("/");
    }
}

// Expand the collapsed panel when a chat is opened from the list
watch(activeChatId, () => {
    collapsed.value = false;
});
</script>

<template>
    <div class="chat-panel" :class="collapsed ? 'collapsed' : 'expanded'">
        <div class="chat-panel-header">
            <span class="chat-panel-title">GalaxyAI</span>
            <ChatActions v-model:collapsed="collapsed" source="panel" @dock-to="dockTo" />
        </div>
        <div v-show="!collapsed" class="chat-panel-body">
            <PluginChat :plugin="props.plugin" source="panel" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.chat-panel {
    flex-shrink: 0;
    border-top: $border-default;
}

.chat-panel.expanded {
    height: 50vh;
    display: flex;
    flex-direction: column;
}

.chat-panel-header {
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: $panel-bg-color;
    user-select: none;
}

.chat-panel-title {
    font-weight: 600;
    font-size: 0.85rem;
}

.chat-panel-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}
</style>
