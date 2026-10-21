import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrainSession } from "@/components/GalaxyAI/brain/host";
import { Toast } from "@/composables/toast";

import { useChatStore } from "./chatStore";

vi.mock("@/api/client", () => ({ GalaxyApi: () => ({ GET: vi.fn(async () => ({ data: [] })) }) }));

function session(capabilities: object = { chat: {} }) {
    const brain = {
        info: { name: "mock", version: "0" },
        capabilities,
        open: vi.fn(async () => {}),
        ask: vi.fn(async () => {}),
    };
    return brain as typeof brain & BrainSession;
}

describe("the chat store's brain commands", () => {
    beforeEach(() => setActivePinia(createPinia()));

    it("gives a ready brain the brain's own default when nothing was asked", () => {
        const store = useChatStore();
        const brain = session();
        store.brainReady(brain);
        expect(brain.open).toHaveBeenCalledWith({});
    });

    it("keeps the latest command for the brain that is ready next", () => {
        const store = useChatStore();
        store.openChat("a1");
        store.askChat("Count my reads");
        const brain = session();
        store.brainReady(brain);
        expect(brain.ask).toHaveBeenCalledWith({ question: "Count my reads" });
        expect(brain.open).not.toHaveBeenCalled();
    });

    it("commands a ready brain at once, and leaves the chat it shows as it is", () => {
        const store = useChatStore();
        const brain = session();
        store.brainReady(brain);
        store.activeChanged("a1");
        store.openChat("a1");
        store.openChat("b2");
        expect(brain.open.mock.calls).toEqual([[{}], [{ exchange_id: "b2" }]]);
    });

    it("takes the active chat from the brain's report, and reopens it in a brain that loads again", () => {
        const store = useChatStore();
        store.brainReady(session());
        store.activeChanged("a1");
        expect(store.activeChatId).toBe("a1");
        store.brainClosed();
        const again = session();
        store.brainReady(again);
        expect(again.open).toHaveBeenCalledWith({ exchange_id: "a1" });
    });
});

describe("the chat store's unsaved changes", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    const tracking = () => session({ chat: { unsaved: {} } });

    it("follows the brain's reports: modified, saved, a newly opened conversation", () => {
        const store = useChatStore();
        store.brainReady(tracking());
        expect(store.unsaved).toBe(false);
        store.unsavedChanged(true);
        expect(store.unsaved).toBe(true);
        store.unsavedChanged(false);
        expect(store.unsaved).toBe(false);
    });

    it("asks before a command replaces a conversation with unsaved changes, and gives none if declined", () => {
        const store = useChatStore();
        const brain = tracking();
        store.brainReady(brain);
        store.activeChanged("a1");
        store.unsavedChanged(true);
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        expect(store.openChat("b2")).toBe(false);
        expect(store.askChat("Count my reads")).toBe(false);
        expect(store.openChat("a1")).toBe(true);
        expect(confirm).toHaveBeenCalledTimes(2);
        confirm.mockImplementation(() => true);
        expect(store.openChat("b2")).toBe(true);
        expect(brain.open.mock.calls).toEqual([[{}], [{ exchange_id: "b2" }]]);
        expect(brain.ask).not.toHaveBeenCalled();
    });

    it("asks nothing while the conversation is saved", () => {
        const store = useChatStore();
        store.brainReady(tracking());
        const confirm = vi.fn(() => true);
        vi.stubGlobal("confirm", confirm);
        store.openChat("b2");
        store.askChat("Count my reads");
        expect(confirm).not.toHaveBeenCalled();
    });

    it("keeps the warning while a brain reloads, says the changes may be gone, and takes the new brain's word", () => {
        const store = useChatStore();
        store.brainReady(tracking());
        store.unsavedChanged(true);
        const warning = vi.spyOn(Toast, "warning").mockImplementation(() => undefined as never);
        store.brainClosed();
        store.brainUnloaded();
        expect(warning).toHaveBeenCalledTimes(1);
        expect(store.unsaved).toBe(true);
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        expect(store.openChat("b2")).toBe(false);
        expect(confirm).toHaveBeenCalledTimes(1);
        store.brainReady(tracking());
        expect(store.unsaved).toBe(true);
        store.unsavedChanged(false);
        expect(store.unsaved).toBe(false);
    });

    it("forgets the warning for a brain that does not report unsaved changes", () => {
        const store = useChatStore();
        store.brainReady(tracking());
        store.unsavedChanged(true);
        store.brainClosed();
        store.brainReady(session());
        expect(store.unsaved).toBe(false);
    });
});

describe("the chat store's pane apart", () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    it("mounts the pane apart only for a brain that draws one, and only while the chat is docked", () => {
        const store = useChatStore();
        store.dockChat("right");
        expect(store.isPaneApart).toBe(false);
        store.brainReady(session({ chat: { pane: {} } }));
        expect(store.isPaneApart).toBe(true);
        // Hidden, the docked chat keeps its pane, so showing it again moves nothing.
        store.hideChat();
        expect(store.isPaneApart).toBe(true);
        store.dockChat("bottom");
        expect(store.isPaneApart).toBe(true);
        store.setLocation("center");
        expect(store.isPaneApart).toBe(false);
    });

    it("keeps the pane through a brain reload, and drops it for a brain that does not draw one", () => {
        const store = useChatStore();
        store.dockChat("right");
        store.brainReady(session({ chat: { pane: {} } }));
        store.brainClosed();
        expect(store.isPaneApart).toBe(true);
        store.brainReady(session());
        expect(store.isPaneApart).toBe(false);
    });
});
