import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { Toast } from "@/composables/toast";
import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

import { useChatStore } from "./chatStore";

const { mockConfig } = vi.hoisted(() => ({ mockConfig: { value: {} as Record<string, unknown> } }));

vi.mock("@/api/client", () => ({
    GalaxyApi: () => ({
        GET: vi.fn(async (path: string) => ({ data: path === "/api/configuration" ? mockConfig.value : [] })),
    }),
}));

vi.mock("@/composables/userLocalStorage", () => ({
    useUserLocalStorage: vi.fn((key: string, initialValue: unknown) =>
        ref(key === "active-chat-id" ? "native-chat" : initialValue),
    ),
}));

/** Returns the chat store of a signed-in user on a Galaxy configured with `plugin` */
function storeWith(plugin: string | null) {
    setActivePinia(createPinia());
    mockConfig.value = { ai_chat_plugin: plugin };
    useConfigStore().setConfiguration(mockConfig.value);
    useUserStore().currentUser = { id: "u1", email: "u1@example.org" } as never;
    return useChatStore();
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("the chat store with a chat plugin", () => {
    let store: ReturnType<typeof useChatStore>;
    beforeEach(() => {
        store = storeWith("fixture");
    });

    it("names the plugin and shows the chat the plugin reports", () => {
        expect(store.chatPlugin).toBe("fixture");
        expect(store.activeChatId).toBeNull();
        store.agentReported({ type: "active", exchange_id: "a1" });
        expect(store.activeChatId).toBe("a1");
        store.setActiveChatId("b2");
        store.showChat("c3");
        expect(store.activeChatId).toBe("a1");
    });

    it("mounts the plugin with the first command, and holds later ones in order until it is ready", () => {
        store.openChat("a1");
        store.askChat("Count my reads");
        store.openChat("b2");
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "a1" });
        store.agentLoaded();
        expect(store.takeCommands()).toEqual([]);
        store.agentReported({ type: "ready" });
        expect(store.takeCommands()).toEqual([
            { type: "ask", question: "Count my reads" },
            { type: "open", exchange_id: "b2" },
        ]);
        expect(store.takeCommands()).toEqual([]);
    });

    it("keeps every question once the plugin has read its config", () => {
        store.agentLoaded();
        store.askChat("First");
        store.askChat("Second");
        store.agentReported({ type: "ready" });
        expect(store.takeCommands()).toEqual([
            { type: "ask", question: "First" },
            { type: "ask", question: "Second" },
        ]);
        expect(store.chatConfig).toEqual({ view: "chat" });
    });

    it("leaves the chat the plugin shows, unless a pending command replaces it", () => {
        store.agentLoaded();
        store.agentReported({ type: "ready" });
        store.agentReported({ type: "active", exchange_id: "a1" });
        expect(store.openChat("a1")).toBe(true);
        expect(store.chatCommands).toEqual([]);
        store.agentReported({ type: "unsaved", value: false });
        store.chatCommands.push({ type: "open", exchange_id: "b2" });
        store.openChat("a1");
        expect(store.chatCommands).toEqual([
            { type: "open", exchange_id: "b2" },
            { type: "open", exchange_id: "a1" },
        ]);
    });

    it("asks before replacing an unsaved conversation, and sends nothing if declined", () => {
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        store.agentLoaded();
        store.agentReported({ type: "unsaved", value: true });
        expect(store.openChat("b2")).toBe(false);
        expect(store.askChat("Count my reads")).toBe(false);
        expect(store.chatCommands).toEqual([]);
        confirm.mockReturnValue(true);
        expect(store.askChat("Count my reads")).toBe(true);
        expect(store.chatCommands).toEqual([{ type: "ask", question: "Count my reads" }]);
    });

    it("says when the plugin did not start, and not once it is ready", () => {
        store.agentSilent();
        expect(store.agentState).toBe("failed");
        store.agentReported({ type: "ready" });
        expect(store.agentState).toBe("ready");
        store.agentSilent();
        expect(store.agentState).toBe("ready");
    });

    it("mounts the plugin again on the chat it reported, keeping undelivered commands", () => {
        const warning = vi.spyOn(Toast, "warning").mockImplementation(() => undefined as never);
        store.openChat("a1");
        store.agentLoaded();
        store.agentReported({ type: "ready" });
        store.agentReported({ type: "active", exchange_id: "a1" });
        store.agentReported({ type: "unsaved", value: true });
        store.chatUnloaded();
        expect(warning).toHaveBeenCalledTimes(1);
        expect(store.chatMounts).toBe(1);
        expect(store.agentState).toBe("loading");
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "a1" });
        vi.stubGlobal("confirm", () => true);
        store.askChat("Again");
        expect(store.chatCommands).toEqual([{ type: "ask", question: "Again" }]);
    });

    it("lists every chat, also in a notebook", async () => {
        await store.loadHistory("page1");
        expect(store.chatHistory).toEqual([]);
    });
});

describe("the chat store without a chat plugin", () => {
    it("keeps Galaxy's own chat state", () => {
        const store = storeWith(null);
        expect(store.chatPlugin).toBeNull();
        expect(store.activeChatId).toBe("native-chat");
        expect(store.openChat("b2")).toBe(true);
        expect(store.activeChatId).toBe("b2");
        expect(store.chatCommands).toEqual([]);
        expect(store.chatConfig).toEqual({ view: "chat" });
    });
});
