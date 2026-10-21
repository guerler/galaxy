<script setup lang="ts">
import { faCheckSquare, faSquare } from "@fortawesome/free-regular-svg-icons";
import { faClock, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { useConfirmDialog } from "@/composables/confirmDialog";
import { useToast } from "@/composables/toast";
import { useSidebarSelection } from "@/composables/useSidebarSelection";
import { useChatStore } from "@/stores/chatStore";
import { errorMessageAsString } from "@/utils/simple-error";

import { getAgentIcon } from "./agentTypes";
import type { ChatHistoryItem } from "./chatTypes";

import GButton from "../BaseComponents/GButton.vue";
import ChatModeSelector from "./ChatModeSelector.vue";
import ActivityPanel from "@/components/Panels/ActivityPanel.vue";
import ScrollList from "@/components/ScrollList/ScrollList.vue";
import UtcDate from "@/components/UtcDate.vue";

const { confirm } = useConfirmDialog();
const Toast = useToast();
const router = useRouter();
const chatStore = useChatStore();

/** Every saved chat: the plugin's own, and those GalaxyAI held, which the plugin opens as far as they go. */
const { chatHistory: chats, loading, activeChatId: currentExchangeId } = storeToRefs(chatStore);

const {
    selectionMode,
    selectedIds,
    allSelected,
    toggleSelectionMode,
    toggleSelectAll,
    handleSelectionClick,
    pruneAfterDelete,
} = useSidebarSelection(chats, (item) => item.id);

onMounted(async () => {
    try {
        await chatStore.loadHistory();
    } catch (e) {
        Toast.error(errorMessageAsString(e), "Failed to load chat history");
    }
});

function handleItemClick(item: ChatHistoryItem, index: number, event: MouseEvent) {
    if (handleSelectionClick(item, index, event)) {
        return;
    }
    // In the center the address opens it, as a link or a reload would; docked, the store does.
    if (chatStore.isCenterMode) {
        router.push(`/galaxyai/${item.id}`);
    } else {
        if (chatStore.openChat(item.id)) {
            chatStore.showChat();
        }
    }
}

async function deleteSelected() {
    if (selectedIds.value.size === 0) {
        return;
    }

    const confirmed = await confirm(
        `Are you sure you want to delete the ${selectedIds.value.size} selected conversation(s)?`,
        {
            title: "Delete Conversations",
            okText: "Delete",
            okIcon: faTrash,
            okColor: "red",
        },
    );
    if (confirmed) {
        const deletedIds = new Set(selectedIds.value);
        const routedChatId = currentExchangeId.value;
        try {
            await chatStore.deleteChatsByIds(deletedIds);
            pruneAfterDelete();
            // The address no longer names a chat that is gone; the brain keeps what it shows until it saves anew.
            if (chatStore.isCenterMode && routedChatId && deletedIds.has(routedChatId)) {
                router.push("/galaxyai");
            }
        } catch (e) {
            Toast.error(errorMessageAsString(e, "Failed to delete conversations."), "Error deleting conversations");
        }
    }
}
</script>

<template>
    <ActivityPanel title="GalaxyAI">
        <template v-slot:header-buttons>
            <GButton
                :disabled="chats.length === 0"
                transparent
                size="small"
                :pressed="selectionMode"
                :title="selectionMode ? 'Cancel selection' : 'Select chats to delete'"
                @click="toggleSelectionMode">
                <FontAwesomeIcon :icon="selectionMode ? faTimes : faTrash" fixed-width />
            </GButton>
        </template>

        <template v-slot:header>
            <ChatModeSelector class="pt-1" />
        </template>

        <div v-if="selectionMode && chats.length > 0" class="selection-toolbar">
            <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events vuejs-accessibility/no-static-element-interactions -->
            <span class="select-all-toggle" @click="toggleSelectAll">
                <FontAwesomeIcon :icon="allSelected ? faCheckSquare : faSquare" fixed-width />
                {{ allSelected ? "Deselect all" : "Select all" }}
            </span>
            <GButton
                data-description="delete selected chats"
                :disabled="selectedIds.size === 0"
                size="small"
                @click="deleteSelected">
                <FontAwesomeIcon :icon="faTrash" fixed-width />
                Delete {{ selectedIds.size > 0 ? selectedIds.size : "" }}
            </GButton>
        </div>

        <ScrollList
            :prop-items="chats"
            :prop-busy="loading"
            :prop-total-count="chats.length"
            :item-key="(item) => item.id"
            load-disabled
            in-panel
            name="chat"
            name-plural="chats">
            <template v-slot:item="{ item, index }">
                <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events vuejs-accessibility/no-static-element-interactions -->
                <div
                    class="chat-history-item d-flex align-items-start p-2 border-bottom unselectable"
                    :class="{ selected: selectedIds.has(item.id), current: item.id === currentExchangeId }"
                    role="button"
                    tabindex="0"
                    @click="(event: MouseEvent) => handleItemClick(item, index, event)">
                    <span v-if="selectionMode" class="history-checkbox">
                        <FontAwesomeIcon :icon="selectedIds.has(item.id) ? faCheckSquare : faSquare" fixed-width />
                    </span>
                    <div class="history-content">
                        <div class="history-query">{{ item.query }}</div>
                        <div class="history-meta">
                            <span class="history-agent">
                                <FontAwesomeIcon :icon="getAgentIcon(item.agent_type)" fixed-width />
                            </span>
                            <span class="history-time">
                                <FontAwesomeIcon :icon="faClock" class="mr-1" />
                                <UtcDate :date="item.timestamp" mode="elapsed" />
                            </span>
                        </div>
                    </div>
                </div>
            </template>
        </ScrollList>
    </ActivityPanel>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.selection-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 0.5rem;
    border-bottom: 1px solid darken($panel-bg-color, 5%);
    font-size: 0.75rem;
}

.select-all-toggle {
    cursor: pointer;
    color: $text-muted;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    &:hover {
        color: $text-color;
    }
}

:deep(.chat-history-item) {
    cursor: pointer;
    &:hover {
        background: var(--color-grey-200) !important;
    }
}
:deep(.chat-history-item.selected) {
    background: var(--color-blue-200);
}
:deep(.chat-history-item.current) {
    border-left: 0.25rem solid $brand-primary;
}

.history-checkbox {
    flex-shrink: 0;
    color: $text-muted;
    padding-top: 0.1rem;
}

.history-content {
    flex: 1;
    min-width: 0;
}

.history-query {
    font-size: 0.8rem;
    color: $text-color;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.2rem;
}

.history-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    color: $text-light;

    .history-agent {
        color: $brand-primary;
    }

    .history-time {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
}
</style>
