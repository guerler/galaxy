import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { useChatStore } from "@/stores/chatStore";

import ChatHistoryPanel from "./ChatHistoryPanel.vue";

const mockPush = vi.fn();

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: mockPush }),
}));

const localVue = getLocalVue();

const CHATS = [
    { id: "a1", query: "Plot the counts", response: "Done", agent_type: "olit", message_count: 4 },
    { id: "g1", query: "What is a BAM file?", response: "A format", agent_type: "router", message_count: 2 },
];

function mountPanel() {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    setActivePinia(pinia);
    const store = useChatStore();
    store.loadHistory = vi.fn(async () => {
        store.chatHistory = CHATS as never;
    });
    store.setLocation("center");
    const wrapper = mount(ChatHistoryPanel as object, {
        localVue,
        pinia,
        stubs: {
            ActivityPanel: defineComponent({
                setup(_, { slots }) {
                    return () => h("div", [slots["header-buttons"]?.(), slots.default?.()]);
                },
            }),
            ScrollList: defineComponent({
                props: { propItems: { type: Array, default: () => [] } },
                setup(props, { slots }) {
                    return () =>
                        h(
                            "div",
                            props.propItems.map((item, index) => slots.item?.({ item, index })),
                        );
                },
            }),
            ChatModeSelector: true,
            UtcDate: true,
            FontAwesomeIcon: true,
        },
    });
    return { wrapper, store };
}

const queries = (wrapper: ReturnType<typeof mountPanel>["wrapper"]) =>
    wrapper.findAll(".history-query").map((query) => query.text());

describe("ChatHistoryPanel", () => {
    beforeEach(() => mockPush.mockClear());

    it("lists every saved chat, GalaxyAI's included, and leaves starting one to the plugin", async () => {
        const { wrapper } = mountPanel();
        await flushPromises();
        expect(queries(wrapper)).toEqual(["Plot the counts", "What is a BAM file?"]);
        expect(wrapper.find("[title='New Chat']").exists()).toBe(false);
    });

    it("opens a saved chat through the address in the center, and marks the one the brain reports", async () => {
        const { wrapper, store } = mountPanel();
        await flushPromises();
        await wrapper.find(".chat-history-item").trigger("click");
        expect(mockPush).toHaveBeenCalledWith("/galaxyai/a1");
        store.activeChanged("a1");
        await flushPromises();
        expect(wrapper.find(".chat-history-item").classes()).toContain("current");
    });

    it("opens a saved chat in the brain when docked", async () => {
        const { wrapper, store } = mountPanel();
        store.setLocation("right");
        const brain = {
            capabilities: { chat: {} },
            open: vi.fn(async (_params: object) => {}),
            ask: vi.fn(async (_params: object) => {}),
        };
        store.brainReady(brain as never);
        await flushPromises();
        await wrapper.find(".chat-history-item").trigger("click");
        expect(brain.open).toHaveBeenLastCalledWith({ exchange_id: "a1" });
        expect(mockPush).not.toHaveBeenCalled();
    });
});
