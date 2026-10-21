import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { GalaxyApi } from "@/api/client";
import type { BrainSession } from "@/components/GalaxyAI/brain/host";
import type { ChatHistoryItem } from "@/components/GalaxyAI/chatTypes";
import { Toast } from "@/composables/toast";
import { useUserLocalStorage } from "@/composables/userLocalStorage";
import { errorMessageAsString, rethrowSimple } from "@/utils/simple-error";

export type ChatLocation = "center" | "right" | "bottom";

type Command = { method: "open"; params: { exchange_id?: string } } | { method: "ask"; params: { question: string } };

export const useChatStore = defineStore("chatStore", () => {
    const chatLocation = useUserLocalStorage<ChatLocation>("chat-location", "center");
    const chatVisible = useUserLocalStorage("chat-visible", false);
    const chatHistory = ref<ChatHistoryItem[]>([]);
    const loading = ref(false);
    /** The saved chat the brain shows, as the brain last reported it; null while it shows none. */
    const activeChatId = ref<string | null>(null);
    /** The initialized brain, while there is one. */
    const brain = shallowRef<BrainSession | null>(null);
    /** The latest command given while no brain was ready, for the next one that is. */
    let pending: Command | null = null;
    /**
     * Whether the brain's conversation has unsaved changes, as it last said. Kept while a brain
     * reloads, until the new one says, so the warnings hold meanwhile.
     */
    const unsaved = ref(false);
    /** Whether the brain draws its pane apart from its chat (`chat.pane`), as the last brain ready said. */
    const brainPane = ref(false);

    const isRightPanelOpen = computed(() => chatLocation.value === "right" && chatVisible.value);
    const isBottomPanelOpen = computed(() => chatLocation.value === "bottom" && chatVisible.value);
    const isCenterMode = computed(() => chatLocation.value === "center");
    /** The brain's pane is mounted apart while the chat is docked beside other content. */
    const isPaneApart = computed(() => brainPane.value && !isCenterMode.value);

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

    /** Give the brain a command now, or keep it for the brain that is ready next. */
    function command(next: Command) {
        if (brain.value) {
            send(brain.value, next);
        } else {
            pending = next;
        }
    }

    function send(session: BrainSession, next: Command) {
        const given = next.method === "open" ? session.open(next.params) : session.ask(next.params);
        given.catch((e) => Toast.error(errorMessageAsString(e), "GalaxyAI did not take that"));
    }

    /** Whether the brain's conversation may be replaced: it has nothing unsaved, or the user agrees. */
    function mayReplace() {
        return !unsaved.value || window.confirm("This chat has unsaved changes, which may be lost. Continue?");
    }

    /** Show a saved chat in the brain; the one it already shows stays as it is. False if declined. */
    function openChat(id: string) {
        const replacing = activeChatId.value !== id;
        const accepted = !replacing || mayReplace();
        if (replacing && accepted) {
            command({ method: "open", params: { exchange_id: id } });
        }
        return accepted;
    }

    /** Start a new conversation in the brain with a question. False if declined. */
    function askChat(question: string) {
        const accepted = mayReplace();
        if (accepted) {
            command({ method: "ask", params: { question } });
        }
        return accepted;
    }

    /** A brain is ready: it is given the command kept for it, or told to show what was shown. */
    function brainReady(session: BrainSession) {
        brain.value = session;
        // A brain that does not say leaves nothing known to warn about.
        if (!session.capabilities.chat?.unsaved) {
            unsaved.value = false;
        }
        brainPane.value = !!session.capabilities.chat?.pane;
        const initial = pending ?? {
            method: "open",
            params: activeChatId.value ? { exchange_id: activeChatId.value } : {},
        };
        pending = null;
        send(session, initial);
    }

    function brainClosed() {
        brain.value = null;
    }

    /** The brain's page went away; it is mounted again. What it had unsaved may not come back. */
    function brainUnloaded() {
        if (unsaved.value) {
            Toast.warning(
                "The AI chat reloaded while it had unsaved changes. Check that they are still there.",
                "GalaxyAI reloaded",
            );
        }
    }

    function unsavedChanged(value: boolean) {
        unsaved.value = value;
    }

    /** The brain reports the conversation it shows; a newly saved one is listed. */
    function activeChanged(id: string | null) {
        activeChatId.value = id;
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
        isPaneApart,
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
        brainClosed,
        brainReady,
        brainUnloaded,
        unsaved,
        unsavedChanged,
        openChat,
        toggleChat,
        setLocation,
        dockChat,
    };
});
