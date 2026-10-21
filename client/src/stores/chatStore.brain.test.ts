import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrainSession } from "@/components/GalaxyAI/brain/host";

import { useChatStore } from "./chatStore";

vi.mock("@/api/client", () => ({ GalaxyApi: () => ({ GET: vi.fn(async () => ({ data: [] })) }) }));

function session() {
    const brain = {
        info: { name: "mock", version: "0" },
        capabilities: { chat: {} },
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
