<script setup lang="ts">
import {
    faAngleDoubleDown,
    faChevronDown,
    faChevronUp,
    faColumns,
    faExpand,
    faList,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { useActivityStore } from "@/stores/activityStore.js";
import { useChatStore } from "@/stores/chatStore";

import GButton from "../BaseComponents/GButton.vue";

const props = defineProps<{
    source: "docked" | "panel" | "center";
    collapsed?: boolean;
}>();

const emit = defineEmits<{
    (e: "dock-to", location: "right" | "bottom"): void;
    (e: "update:collapsed", value: boolean): void;
}>();

const router = useRouter();
const chatStore = useChatStore();
const activityStore = useActivityStore("default");

const showingActivityPanel = computed(() => activityStore.toggledSideBar === "galaxyai");

function maximize() {
    const chatId = chatStore.activeChatId;
    chatStore.setLocation("center");
    chatStore.hideChat();
    router.push(chatId ? `/galaxyai/${chatId}` : "/galaxyai");
}

function onDockTo(location: "right" | "bottom") {
    emit("dock-to", location);
}
</script>

<template>
    <div class="chat-panel-actions">
        <GButton
            size="small"
            transparent
            outline
            :pressed="showingActivityPanel"
            :title="showingActivityPanel ? 'Hide Chats Panel' : 'Show Chats Panel'"
            @click="activityStore.toggleSideBar('galaxyai')">
            <FontAwesomeIcon :icon="faList" fixed-width />
            <span class="btn-label">
                <span v-if="showingActivityPanel">Hide</span>
                <span v-else>Show</span>
                Chats
            </span>
        </GButton>
        <GButton
            v-if="props.source !== 'center'"
            size="small"
            transparent
            title="Open in center view"
            @click="maximize">
            <FontAwesomeIcon :icon="faExpand" fixed-width />
        </GButton>
        <GButton
            v-if="props.source !== 'docked'"
            size="small"
            transparent
            title="Dock to side panel"
            @click="onDockTo('right')">
            <FontAwesomeIcon :icon="faColumns" fixed-width />
        </GButton>
        <GButton
            v-if="props.source !== 'panel'"
            size="small"
            transparent
            title="Dock to bottom panel"
            @click="onDockTo('bottom')">
            <FontAwesomeIcon :icon="faAngleDoubleDown" fixed-width />
        </GButton>
        <GButton
            v-if="props.source === 'panel'"
            size="small"
            transparent
            title="Toggle panel"
            @click="emit('update:collapsed', !props.collapsed)">
            <FontAwesomeIcon :icon="props.collapsed ? faChevronUp : faChevronDown" fixed-width />
        </GButton>
        <GButton
            v-if="props.source !== 'center'"
            size="small"
            transparent
            title="Close panel"
            @click="chatStore.hideChat()">
            <FontAwesomeIcon :icon="faTimes" fixed-width />
        </GButton>
    </div>
</template>

<style scoped>
.chat-panel-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.25rem;
}

@container (max-width: 440px) {
    .btn-label {
        display: none;
    }
}
</style>
