import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";

import { useChatStore } from "@/stores/chatStore";

import ChatHistoryPanel from "./ChatHistoryPanel.vue";

const mockPush = vi.fn();
const mockPlugin = ref<string | null>(null);

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: mockPush }),
    useRoute: () => ({ path: "/galaxyai", params: {} }),
}));

vi.mock("@/composables/useChatPlugin", () => ({ useActiveChatPlugin: () => mockPlugin }));
vi.mock("@/composables/useActiveContext", () => ({ useActiveContext: () => ({ activeContext: ref(null) }) }));

const localVue = getLocalVue();

const CHATS = [
    { id: "a1", query: "Plot the counts", response: "Done", agent_type: "olit", message_count: 4 },
    { id: "g1", query: "What is a BAM file?", response: "A format", agent_type: "router", message_count: 2 },
];

function mountPanel(plugin: string | null) {
    mockPlugin.value = plugin;
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

    it("lists GalaxyAI's chats and offers a new one without a chat plugin", async () => {
        const { wrapper } = mountPanel(null);
        await wrapper.vm.$nextTick();
        expect(queries(wrapper)).toEqual(["Plot the counts", "What is a BAM file?"]);
        expect(wrapper.find("[title='New Chat']").exists()).toBe(true);
    });

    it("lists only the chat plugin's chats, and leaves starting one to the plugin", async () => {
        const { wrapper } = mountPanel("olit");
        await wrapper.vm.$nextTick();
        expect(queries(wrapper)).toEqual(["Plot the counts"]);
        expect(wrapper.find("[title='New Chat']").exists()).toBe(false);
    });

    it("opens a saved chat in the plugin", async () => {
        const { wrapper, store } = mountPanel("olit");
        await wrapper.vm.$nextTick();
        await wrapper.find(".chat-history-item").trigger("click");
        expect(store.pluginChatId).toBe("a1");
        expect(mockPush).toHaveBeenCalledWith("/galaxyai/a1");
        expect(wrapper.find(".chat-history-item").classes()).toContain("current");
    });
});
