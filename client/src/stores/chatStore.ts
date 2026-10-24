import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { GalaxyApi } from "@/api/client";
import { CHAT_VIEW, type ChatConfig } from "@/components/GalaxyAI/chatPlugin";
import type { ChatHistoryItem } from "@/components/GalaxyAI/chatTypes";
import { Toast } from "@/composables/toast";
import { useUserLocalStorage } from "@/composables/userLocalStorage";
import { rethrowSimple } from "@/utils/simple-error";

export type ChatLocation = "center" | "right" | "bottom";

export const useChatStore = defineStore("chatStore", () => {
    const chatLocation = useUserLocalStorage<ChatLocation>("chat-location", "center");
    const chatVisible = useUserLocalStorage("chat-visible", false);
    const chatHistory = ref<ChatHistoryItem[]>([]);
    const loading = ref(false);
    /** The saved chat the plugin shows, as the plugin last reported it; null while it shows none. */
    const activeChatId = ref<string | null>(null);
    /** What the chat plugin is mounted with: the last command's, then the chat the plugin reports. */
    const chatConfig = shallowRef<ChatConfig>({ view: CHAT_VIEW });
    /** Counts the chat plugin's mounts: each command mounts it anew with its config. */
    const chatMounts = ref(0);
    /**
     * Whether the plugin's conversation has unsaved changes, as it last said. Kept while the plugin
     * mounts anew, until it says, so the warnings hold meanwhile.
     */
    const unsaved = ref(false);

    const isRightPanelOpen = computed(() => chatLocation.value === "right" && chatVisible.value);
    const isBottomPanelOpen = computed(() => chatLocation.value === "bottom" && chatVisible.value);
    const isCenterMode = computed(() => chatLocation.value === "center");

    function deleteChats(ids: Set<string>) {
        chatHistory.value = chatHistory.value.filter((item) => !ids.has(item.id));
    }

    async function deleteChatById(chatId: string) {
        if (!chatId) {
            return;
        }
        const { error } = await GalaxyApi().DELETE("/api/chat/exchange/{exchange_id}", {
            params: { path: { exchange_id: chatId } },
        });
        if (error) {
            rethrowSimple(error);
        }

        deleteChats(new Set([chatId]));
    }

    async function deleteChatsByIds(ids: Set<string>) {
        if (ids.size === 0) {
            return;
        }
        const { error } = await GalaxyApi().PUT("/api/chat/exchanges/batch/delete", {
            body: { ids: Array.from(ids) },
        });
        if (error) {
            rethrowSimple(error);
        }

        deleteChats(ids);
    }

    function showChat() {
        if (!chatVisible.value) {
            chatVisible.value = true;
        }
    }

    function hideChat() {
        if (chatVisible.value) {
            chatVisible.value = false;
        }
    }

    async function loadHistory() {
        loading.value = true;

        const { data, error } = await GalaxyApi().GET("/api/chat/history", {
            params: { query: { limit: 50 } },
        });

        loading.value = false;

        if (error) {
            rethrowSimple(error);
        } else if (data) {
            chatHistory.value = data as unknown as ChatHistoryItem[];
        }
    }

    function toggleChat() {
        chatVisible.value = !chatVisible.value;
    }

    function setLocation(loc: ChatLocation) {
        if (chatLocation.value !== loc) {
            chatLocation.value = loc;
        }
    }

    /** Mount the chat plugin anew with `config`. */
    function command(config: Omit<ChatConfig, "view">) {
        chatConfig.value = { view: CHAT_VIEW, ...config };
        chatMounts.value++;
    }

    /** Whether the plugin's conversation may be replaced: it has nothing unsaved, or the user agrees. */
    function mayReplace() {
        return !unsaved.value || window.confirm("This chat has unsaved changes, which may be lost. Continue?");
    }

    /** Show a saved chat in the plugin; the one it already shows stays as it is. False if declined. */
    function openChat(id: string) {
        const replacing = activeChatId.value !== id;
        const accepted = !replacing || mayReplace();
        if (replacing && accepted) {
            command({ exchange_id: id });
        }
        return accepted;
    }

    /** Start a new conversation in the plugin with a question. False if declined. */
    function askChat(question: string) {
        const accepted = mayReplace();
        if (accepted) {
            command({ question });
        }
        return accepted;
    }

    /** The plugin's page went away; it is mounted again. What it had unsaved may not come back. */
    function chatUnloaded() {
        if (unsaved.value) {
            Toast.warning(
                "The AI chat reloaded while it had unsaved changes. Check that they are still there.",
                "GalaxyAI reloaded",
            );
        }
        chatMounts.value++;
    }

    function unsavedChanged(value: boolean) {
        unsaved.value = value;
    }

    /**
     * The plugin reports the conversation it shows, kept for its next mount; a newly saved one is
     * listed.
     */
    function activeChanged(id: string | null) {
        activeChatId.value = id;
        chatConfig.value = id ? { view: CHAT_VIEW, exchange_id: id } : { view: CHAT_VIEW };
        if (id && !chatHistory.value.some((item) => item.id === id)) {
            loadHistory().catch(() => {});
        }
    }

    /** Sets the chat location and shows the chat in one step. */
    function dockChat(location: ChatLocation) {
        setLocation(location);
        showChat();
    }

    return {
        chatHistory,
        chatLocation,
        chatVisible,
        isRightPanelOpen,
        isBottomPanelOpen,
        isCenterMode,
        deleteChatById,
        deleteChats,
        deleteChatsByIds,
        showChat,
        hideChat,
        loadHistory,
        loading,
        activeChanged,
        activeChatId,
        askChat,
        chatConfig,
        chatMounts,
        chatUnloaded,
        unsaved,
        unsavedChanged,
        openChat,
        toggleChat,
        setLocation,
        dockChat,
    };
});
