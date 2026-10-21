import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { shallowMount, type VueWrapper } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useChatStore } from "@/stores/chatStore";

import GalaxyAIRoute from "./GalaxyAIRoute.vue";
import PluginChat from "./PluginChat.vue";
import GAlert from "@/components/BaseComponents/GAlert.vue";

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

function mountRoute(
    plugin: string | null,
    propsData: { exchangeId?: string; initialQuestion?: string },
    before: (store: ReturnType<typeof useChatStore>) => void = () => {},
) {
    mockPlugin.value = plugin;
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    setActivePinia(pinia);
    before(useChatStore());
    mounted.push(shallowMount(GalaxyAIRoute as object, { localVue, pinia, propsData }));
    return useChatStore();
}

/** The commands a brain is given once ready, after the route was mounted. */
function commanded(plugin: string | null, propsData: { exchangeId?: string; initialQuestion?: string }) {
    const store = mountRoute(plugin, propsData);
    const brain = {
        capabilities: { chat: {} },
        open: vi.fn(async (_params: object) => {}),
        ask: vi.fn(async (_params: object) => {}),
    };
    store.brainReady(brain as never);
    return { open: brain.open.mock.calls.map(([params]) => params), ask: brain.ask.mock.calls.map(([p]) => p) };
}

describe("GalaxyAIRoute", () => {
    it("opens a saved chat named in the URL in the brain", () => {
        expect(commanded("olit", { exchangeId: "a1" }).open).toEqual([{ exchange_id: "a1" }]);
    });

    it("leaves the brain its own default for a new chat, no chat, or no plugin", () => {
        expect(commanded("olit", { exchangeId: "new" }).open).toEqual([{}]);
        expect(commanded("olit", {}).open).toEqual([{}]);
        expect(commanded(null, { exchangeId: "a1" }).open).toEqual([{}]);
    });

    it("starts a new chat in the plugin with a question handed over in the URL, once", () => {
        mockReplace.mockClear();
        const { ask } = commanded("olit", { exchangeId: "new", initialQuestion: "What is in my history?" });
        expect(ask).toEqual([{ question: "What is in my history?" }]);
        expect(mockReplace).toHaveBeenCalledWith({ path: "/galaxyai/new", query: {} });
    });

    it("sends the address back to the chat shown when the user keeps its unsaved changes", () => {
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        const unsavedOn = (store: ReturnType<typeof useChatStore>) => {
            store.activeChanged("a1");
            store.unsavedChanged(true);
        };
        mockReplace.mockClear();
        mountRoute("olit", { exchangeId: "b2" }, unsavedOn);
        expect(mockReplace).toHaveBeenLastCalledWith("/galaxyai/a1");
        mountRoute("olit", { exchangeId: "new", initialQuestion: "Count my reads" }, unsavedOn);
        expect(mockReplace).toHaveBeenLastCalledWith("/galaxyai/a1");
        expect(confirm).toHaveBeenCalledTimes(2);
        vi.unstubAllGlobals();
    });

    it("shows the plugin, or says there is no chat", () => {
        mountRoute("olit", {});
        expect(mounted[0]!.findComponent(PluginChat).props("plugin")).toBe("olit");
        mountRoute(null, {});
        expect(mounted[1]!.findComponent(PluginChat).exists()).toBe(false);
        expect(mounted[1]!.findComponent(GAlert).exists()).toBe(true);
    });
});
