import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

import { GalaxyApi } from "@/api/client";
import { type AgentReport, CHAT_VIEW, type ChatCommand, type ChatConfig } from "@/components/GalaxyAI/chatPlugin";
import type { ChatHistoryItem } from "@/components/GalaxyAI/chatTypes";
import { Toast } from "@/composables/toast";
import { useChatPlugin } from "@/composables/useChatPlugin";
import { useUserLocalStorage } from "@/composables/userLocalStorage";
import { rethrowSimple } from "@/utils/simple-error";

export type ChatLocation = "center" | "right" | "bottom";

export const useChatStore = defineStore("chatStore", () => {
    const chatLocation = useUserLocalStorage<ChatLocation>("chat-location", "center");
    const chatVisible = useUserLocalStorage("chat-visible", false);
    const cachedActiveChatId = useUserLocalStorage<string>("active-chat-id", "");
    const chatHistory = ref<ChatHistoryItem[]>([]);
    const loading = ref(false);
    const newChatRequestCount = ref(0);

    /** The plugin hosted as the chat, or null for Galaxy's own chat */
    const chatPlugin = useChatPlugin();
    /** The saved chat the plugin reports showing */
    const reportedChatId = ref<string | null>(null);
    /** The config the plugin is mounted with, filled in place so a mount reads the latest command */
    const chatConfig = reactive<ChatConfig>({ view: CHAT_VIEW });
    /** Whether the plugin mounted last has read its config */
    let configTaken = false;
    /** Commands the plugin has not received yet, in the order they were given */
    const chatCommands = ref<ChatCommand[]>([]);
    /** Whether the plugin is loading, takes commands, or did not start */
    const agentState = ref<"loading" | "ready" | "failed">("loading");
    /** Counts the plugin's mounts after the first */
    const chatMounts = ref(0);
    /** Whether the plugin's conversation has unsaved changes, as it last reported */
    const unsaved = ref(false);

    const isRightPanelOpen = computed(() => chatLocation.value === "right" && chatVisible.value);
    const isBottomPanelOpen = computed(() => chatLocation.value === "bottom" && chatVisible.value);
    const isCenterMode = computed(() => chatLocation.value === "center");

    // With a plugin, the chat shown is the one the plugin reports.
    const activeChatId = computed({
        get: () => (chatPlugin.value ? reportedChatId.value : cachedActiveChatId.value || null),
        set: (id: string | null) => {
            if (!chatPlugin.value) {
                cachedActiveChatId.value = id || "";
            }
        },
    });

    function deleteChats(ids: Set<string>) {
        chatHistory.value = chatHistory.value.filter((item) => !ids.has(item.id));
        // If the chat currently in view was deleted, drop the reference so we don't
        // leave the UI pointing at a conversation that no longer exists.
        if (activeChatId.value && ids.has(activeChatId.value)) {
            activeChatId.value = null;
        }
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

    function showChat(chatId?: string | null) {
        if (chatId !== undefined) {
            setActiveChatId(chatId);
        }
        if (!chatVisible.value) {
            chatVisible.value = true;
        }
    }

    function hideChat() {
        if (chatVisible.value) {
            chatVisible.value = false;
        }
    }

    async function loadHistory(pageId?: string) {
        loading.value = true;

        const { data, error } =
            pageId && !chatPlugin.value
                ? await GalaxyApi().GET("/api/chat/page/{page_id}/history", {
                      params: { path: { page_id: pageId }, query: { limit: 50 } },
                  })
                : await GalaxyApi().GET("/api/chat/history", {
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

    function setActiveChatId(id: string | null) {
        if (activeChatId.value !== id) {
            activeChatId.value = id;
        }
    }

    /** Ask chat surfaces to reset to a fresh conversation. A counter bump rather than
     * an id change, so the reset also fires for an unsaved conversation whose identity
     * (activeChatId / route param) wouldn't change. */
    function requestNewChat() {
        setActiveChatId(null);
        newChatRequestCount.value++;
    }

    /** Returns the active chat id, falling back to the most recent history item, or null. */
    function resolveDockChatId(): string | null {
        return activeChatId.value ?? chatHistory.value[0]?.id ?? null;
    }

    /** Opens a saved chat. Returns false if the user keeps the plugin's unsaved conversation. */
    function openChat(id: string) {
        let accepted = true;
        if (chatPlugin.value) {
            // A command still pending may replace the chat the plugin shows now.
            const replacing = reportedChatId.value !== id || chatCommands.value.length > 0;
            accepted = !replacing || mayReplace();
            if (replacing && accepted) {
                command({ type: "open", exchange_id: id });
            }
        } else {
            setActiveChatId(id);
        }
        return accepted;
    }

    /** Asks a question in a new conversation of the plugin. Returns false if the user declines. */
    function askChat(question: string) {
        const accepted = mayReplace();
        if (accepted) {
            command({ type: "ask", question });
        }
        return accepted;
    }

    /** Returns whether the plugin's conversation may be replaced, asking the user if it is unsaved */
    function mayReplace() {
        return !unsaved.value || window.confirm("This chat has unsaved changes, which may be lost. Continue?");
    }

    /** Gives the plugin a command: in its config while it has not read it, otherwise in order once ready */
    function command(next: ChatCommand) {
        if (!configTaken && chatCommands.value.length === 0 && !chatConfig.exchange_id && !chatConfig.question) {
            if (next.type === "open") {
                chatConfig.exchange_id = next.exchange_id;
            } else {
                chatConfig.question = next.question;
            }
        } else {
            chatCommands.value.push(next);
        }
    }

    /** Returns the commands the plugin can receive now, and forgets them */
    function takeCommands() {
        let taken: ChatCommand[] = [];
        if (agentState.value === "ready") {
            taken = chatCommands.value;
            chatCommands.value = [];
        }
        return taken;
    }

    /** Marks the config as read by the plugin mounted last */
    function agentLoaded() {
        configTaken = true;
    }

    /** Takes a report from the plugin */
    function agentReported(report: AgentReport) {
        if (report.type === "ready") {
            agentState.value = "ready";
        } else if (report.type === "active") {
            reportedChatId.value = report.exchange_id;
            if (report.exchange_id && !chatHistory.value.some((item) => item.id === report.exchange_id)) {
                loadHistory().catch(() => {});
            }
        } else {
            unsaved.value = report.value;
        }
    }

    /** Marks a plugin that is still loading as one that did not start */
    function agentSilent() {
        if (agentState.value === "loading") {
            agentState.value = "failed";
        }
    }

    /** Mounts the plugin again, showing the chat it reported, after its page went away */
    function chatUnloaded() {
        if (unsaved.value) {
            Toast.warning(
                "The AI chat reloaded while it had unsaved changes. Check that they are still there.",
                "GalaxyAI reloaded",
            );
        }
        delete chatConfig.question;
        if (reportedChatId.value) {
            chatConfig.exchange_id = reportedChatId.value;
        } else {
            delete chatConfig.exchange_id;
        }
        configTaken = false;
        agentState.value = "loading";
        chatMounts.value++;
    }

    /** Sets the chat location and shows the chat with the given id in one step. */
    function dockChat(location: ChatLocation, chatId?: string | null) {
        setLocation(location);
        showChat(chatId);
    }

    return {
        chatHistory,
        chatLocation,
        chatVisible,
        activeChatId,
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
        newChatRequestCount,
        requestNewChat,
        toggleChat,
        setLocation,
        setActiveChatId,
        resolveDockChatId,
        dockChat,
        agentLoaded,
        agentReported,
        agentSilent,
        agentState,
        askChat,
        chatCommands,
        chatConfig,
        chatMounts,
        chatPlugin,
        chatUnloaded,
        openChat,
        takeCommands,
        unsaved,
    };
});
