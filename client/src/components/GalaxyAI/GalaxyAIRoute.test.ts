import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { shallowMount, type VueWrapper } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useChatStore } from "@/stores/chatStore";

import GalaxyAIRoute from "./GalaxyAIRoute.vue";

const mockPlugin = ref<string | null>(null);
const mockReplace = vi.fn();

vi.mock("vue-router", () => ({
    useRoute: () => ({ path: "/galaxyai/new" }),
    useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/composables/useChatPlugin", () => ({ useChatPlugin: () => mockPlugin }));
vi.mock("@/composables/config", () => ({ useConfig: () => ({ isConfigLoaded: ref(true) }) }));

const localVue = getLocalVue();

let mounted: VueWrapper[] = [];
afterEach(() => {
    mounted.forEach((wrapper) => wrapper.unmount());
    mounted = [];
});

function mountRoute(plugin: string | null, propsData: { exchangeId?: string; initialQuestion?: string }) {
    mockPlugin.value = plugin;
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    setActivePinia(pinia);
    mounted.push(shallowMount(GalaxyAIRoute as object, { localVue, pinia, propsData }));
    return useChatStore();
}

const openedFor = (plugin: string | null, exchangeId?: string) => mountRoute(plugin, { exchangeId }).pluginChatId;

describe("GalaxyAIRoute", () => {
    it("opens a saved chat named in the URL in the chat plugin", () => {
        expect(openedFor("olit", "a1")).toBe("a1");
    });

    it("leaves the plugin as it is for a new chat, no chat, or no plugin", () => {
        expect(openedFor("olit", "new")).toBeNull();
        expect(openedFor("olit")).toBeNull();
        expect(openedFor(null, "a1")).toBeNull();
    });

    it("starts a new chat in the plugin with a question handed over in the URL, once", () => {
        mockReplace.mockClear();
        const store = mountRoute("olit", { exchangeId: "new", initialQuestion: "What is in my history?" });
        expect(store.pluginChatConfig).toEqual({ question: "What is in my history?" });
        expect(mockReplace).toHaveBeenCalledWith({ path: "/galaxyai/new", query: {} });
    });
});
