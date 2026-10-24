import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Toast } from "@/composables/toast";

import { useChatStore } from "./chatStore";

vi.mock("@/api/client", () => ({ GalaxyApi: () => ({ GET: vi.fn(async () => ({ data: [] })) }) }));

describe("the chat store's commands", () => {
    beforeEach(() => setActivePinia(createPinia()));

    it("mounts the plugin as the chat, with nothing more to show, until a command says", () => {
        const store = useChatStore();
        expect(store.chatConfig).toEqual({ view: "chat" });
        expect(store.chatMounts).toBe(0);
    });

    it("mounts the plugin anew for each command, with the config that says what to show", () => {
        const store = useChatStore();
        store.openChat("a1");
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "a1" });
        expect(store.chatMounts).toBe(1);
        store.askChat("Count my reads");
        expect(store.chatConfig).toEqual({ view: "chat", question: "Count my reads" });
        expect(store.chatMounts).toBe(2);
    });

    it("leaves the chat the plugin already shows as it is", () => {
        const store = useChatStore();
        store.activeChanged("a1");
        store.openChat("a1");
        expect(store.chatMounts).toBe(0);
    });

    it("keeps the chat the plugin reports for its next mount, without mounting it anew", () => {
        const store = useChatStore();
        store.askChat("Count my reads");
        store.activeChanged(null);
        expect(store.chatConfig).toEqual({ view: "chat" });
        store.activeChanged("a1");
        expect(store.activeChatId).toBe("a1");
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "a1" });
        expect(store.chatMounts).toBe(1);
    });
});

describe("the chat store's unsaved changes", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("follows the plugin's reports", () => {
        const store = useChatStore();
        expect(store.unsaved).toBe(false);
        store.unsavedChanged(true);
        expect(store.unsaved).toBe(true);
        store.unsavedChanged(false);
        expect(store.unsaved).toBe(false);
    });

    it("asks before a command replaces a conversation with unsaved changes, and gives none if declined", () => {
        const store = useChatStore();
        store.activeChanged("a1");
        store.unsavedChanged(true);
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        expect(store.openChat("b2")).toBe(false);
        expect(store.askChat("Count my reads")).toBe(false);
        expect(store.openChat("a1")).toBe(true);
        expect(confirm).toHaveBeenCalledTimes(2);
        expect(store.chatMounts).toBe(0);
        confirm.mockImplementation(() => true);
        expect(store.openChat("b2")).toBe(true);
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "b2" });
        expect(store.chatMounts).toBe(1);
    });

    it("asks nothing while the conversation is saved", () => {
        const store = useChatStore();
        const confirm = vi.fn(() => true);
        vi.stubGlobal("confirm", confirm);
        store.openChat("b2");
        store.askChat("Count my reads");
        expect(confirm).not.toHaveBeenCalled();
    });

    it("keeps the warning while the plugin mounts anew, and takes the new mount's word", () => {
        const store = useChatStore();
        store.unsavedChanged(true);
        vi.stubGlobal("confirm", () => true);
        store.openChat("b2");
        expect(store.unsaved).toBe(true);
        store.unsavedChanged(false);
        expect(store.unsaved).toBe(false);
    });

    it("mounts a plugin whose page went away anew, and says unsaved changes may be gone", () => {
        const store = useChatStore();
        const warning = vi.spyOn(Toast, "warning").mockImplementation(() => undefined as never);
        store.activeChanged("a1");
        store.chatUnloaded();
        expect(warning).not.toHaveBeenCalled();
        expect(store.chatMounts).toBe(1);
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "a1" });
        store.unsavedChanged(true);
        store.chatUnloaded();
        expect(warning).toHaveBeenCalledTimes(1);
        expect(store.unsaved).toBe(true);
        expect(store.chatMounts).toBe(2);
    });
});
