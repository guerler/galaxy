import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useChatStore } from "./chatStore";

describe("what the chat plugin is mounted with", () => {
    beforeEach(() => setActivePinia(createPinia()));

    it("opens a saved chat once, and mounts the plugin again for each new ask", () => {
        const store = useChatStore();
        expect(store.pluginChatConfig).toEqual({});

        store.openPluginChat("a1");
        expect(store.pluginChatConfig).toEqual({ exchange_id: "a1" });
        const opened = store.pluginChatKey;
        store.openPluginChat("a1");
        expect(store.pluginChatKey).toBe(opened);

        store.askPluginChat("Count my reads");
        expect(store.pluginChatConfig).toEqual({ question: "Count my reads" });
        expect(store.pluginChatId).toBeNull();
        store.askPluginChat("Count my reads");
        expect(store.pluginChatKey).toBe(opened + 2);
    });
});
