import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import type { ChatHistoryItem } from "@/components/GalaxyAI/chatTypes";

import { useChatStore } from "./chatStore";

const { mockPut } = vi.hoisted(() => ({ mockPut: vi.fn() }));

vi.mock("@/api/client", () => ({
    GalaxyApi: () => ({ PUT: mockPut, GET: vi.fn(), DELETE: vi.fn() }),
}));

vi.mock("@/composables/userLocalStorage", () => ({
    useUserLocalStorage: vi.fn((_key: string, initialValue: unknown) => ref(initialValue)),
}));

describe("chatStore", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it("initializes with default state", () => {
        const store = useChatStore();
        expect(store.chatLocation).toBe("center");
        expect(store.chatVisible).toBe(false);
        expect(store.activeChatId).toBeNull();
    });

    describe("showChat", () => {
        it("sets visibility to true", () => {
            const store = useChatStore();
            store.showChat();
            expect(store.chatVisible).toBe(true);
        });
    });

    describe("hideChat", () => {
        it("sets visibility to false", () => {
            const store = useChatStore();
            store.showChat();
            store.hideChat();
            expect(store.chatVisible).toBe(false);
        });
    });

    describe("toggleChat", () => {
        it("flips visibility on", () => {
            const store = useChatStore();
            store.toggleChat();
            expect(store.chatVisible).toBe(true);
        });

        it("flips visibility off", () => {
            const store = useChatStore();
            store.showChat();
            store.toggleChat();
            expect(store.chatVisible).toBe(false);
        });
    });

    describe("setLocation", () => {
        it("changes the chat location", () => {
            const store = useChatStore();
            store.setLocation("right");
            expect(store.chatLocation).toBe("right");
            store.setLocation("bottom");
            expect(store.chatLocation).toBe("bottom");
            store.setLocation("center");
            expect(store.chatLocation).toBe("center");
        });
    });

    describe("deleteChats", () => {
        it("removes the given ids from history", () => {
            const store = useChatStore();
            store.chatHistory = [{ id: "a" }, { id: "b" }, { id: "c" }] as ChatHistoryItem[];
            store.deleteChats(new Set(["a", "c"]));
            expect(store.chatHistory.map((item) => item.id)).toEqual(["b"]);
        });
    });

    describe("deleteChatsByIds", () => {
        it("deletes via the batch endpoint", async () => {
            mockPut.mockResolvedValue({ error: undefined });
            const store = useChatStore();
            store.chatHistory = [{ id: "a" }, { id: "b" }, { id: "c" }] as ChatHistoryItem[];
            await store.deleteChatsByIds(new Set(["a", "b"]));

            expect(mockPut).toHaveBeenCalledWith("/api/chat/exchanges/batch/delete", { body: { ids: ["a", "b"] } });
            expect(store.chatHistory.map((item) => item.id)).toEqual(["c"]);
        });

        it("does nothing for an empty set", async () => {
            const store = useChatStore();
            await store.deleteChatsByIds(new Set());
            expect(mockPut).not.toHaveBeenCalled();
        });
    });

    describe("computed panel states", () => {
        it("isRightPanelOpen is true only when right + visible", () => {
            const store = useChatStore();
            expect(store.isRightPanelOpen).toBe(false);

            store.setLocation("right");
            expect(store.isRightPanelOpen).toBe(false);

            store.showChat();
            expect(store.isRightPanelOpen).toBe(true);

            store.setLocation("bottom");
            expect(store.isRightPanelOpen).toBe(false);
        });

        it("isBottomPanelOpen is true only when bottom + visible", () => {
            const store = useChatStore();
            expect(store.isBottomPanelOpen).toBe(false);

            store.setLocation("bottom");
            store.showChat();
            expect(store.isBottomPanelOpen).toBe(true);

            store.hideChat();
            expect(store.isBottomPanelOpen).toBe(false);
        });

        it("isCenterMode reflects location regardless of visibility", () => {
            const store = useChatStore();
            expect(store.isCenterMode).toBe(true);

            store.showChat();
            expect(store.isCenterMode).toBe(true);

            store.setLocation("right");
            expect(store.isCenterMode).toBe(false);
        });
    });
});
