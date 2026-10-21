import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { mount, type VueWrapper } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatStore } from "@/stores/chatStore";

import ChatActions from "./ChatActions.vue";
import GButton from "@/components/BaseComponents/GButton.vue";

const mockPush = vi.fn();

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/stores/activityStore.js", () => ({
    useActivityStore: () => ({ toggledSideBar: null, toggleSideBar: vi.fn() }),
}));

const localVue = getLocalVue();

function mountComponent(source: "center" | "docked" | "panel") {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    setActivePinia(pinia);
    const wrapper = mount(ChatActions as object, {
        localVue,
        pinia,
        propsData: { source },
        stubs: { FontAwesomeIcon: true },
    });
    const store = useChatStore();
    // chatStore is a setup-syntax store, so @pinia/testing's automatic action
    // spying (which relies on the options-API `actions` map) doesn't apply --
    // spy on the actions these tests assert against explicitly.
    vi.spyOn(store, "setLocation");
    vi.spyOn(store, "hideChat");
    return { wrapper, store };
}

/** Find a GButton by its title prop */
function findButton(wrapper: VueWrapper, title: string) {
    const button = wrapper.findAllComponents(GButton).find((candidate) => candidate.props("title") === title);
    if (!button) {
        throw new Error(`GButton with title "${title}" not found`);
    }
    return button;
}

describe("ChatActions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── maximize ──────────────────────────────────────────────────────────────

    describe("maximize", () => {
        it("calls setLocation('center') and hideChat", async () => {
            const { wrapper, store } = mountComponent("docked");
            await findButton(wrapper, "Open in center view").trigger("click");
            expect(store.setLocation).toHaveBeenCalledWith("center");
            expect(store.hideChat).toHaveBeenCalled();
        });

        it("routes to /galaxyai/{id} when the plugin has a saved chat open", async () => {
            const { wrapper, store } = mountComponent("docked");
            store.activeChanged("chat-42");
            await findButton(wrapper, "Open in center view").trigger("click");
            expect(mockPush).toHaveBeenCalledWith("/galaxyai/chat-42");
        });

        it("routes to /galaxyai when the plugin's chat is not saved", async () => {
            const { wrapper } = mountComponent("docked");
            await findButton(wrapper, "Open in center view").trigger("click");
            expect(mockPush).toHaveBeenCalledWith("/galaxyai");
        });
    });

    // ── dock-to emission ──────────────────────────────────────────────────────

    describe("dock-to emission (center source only)", () => {
        it("emits dock-to with 'right' for the side panel button", async () => {
            const { wrapper } = mountComponent("center");
            await findButton(wrapper, "Dock to side panel").trigger("click");
            expect(wrapper.emitted("dock-to")).toEqual([["right"]]);
        });

        it("emits dock-to with 'bottom' for the bottom panel button", async () => {
            const { wrapper } = mountComponent("center");
            await findButton(wrapper, "Dock to bottom panel").trigger("click");
            expect(wrapper.emitted("dock-to")).toEqual([["bottom"]]);
        });
    });

    // ── close ─────────────────────────────────────────────────────────────────

    describe("close button (non-center sources)", () => {
        it("calls chatStore.hideChat in docked mode", async () => {
            const { wrapper, store } = mountComponent("docked");
            await findButton(wrapper, "Close panel").trigger("click");
            expect(store.hideChat).toHaveBeenCalled();
        });

        it("calls chatStore.hideChat in panel mode", async () => {
            const { wrapper, store } = mountComponent("panel");
            await findButton(wrapper, "Close panel").trigger("click");
            expect(store.hideChat).toHaveBeenCalled();
        });
    });
});

describe("ChatActions buttons", () => {
    const titles = (wrapper: VueWrapper) =>
        wrapper.findAllComponents(GButton).map((button) => button.props("title") as string);

    it("places the chat and shows its list: the plugin starts its own conversations and runs once", () => {
        const { wrapper } = mountComponent("docked");
        expect(titles(wrapper)).toEqual([
            "Show Chats Panel",
            "Open in center view",
            "Dock to bottom panel",
            "Close panel",
        ]);
    });

    it("keeps the bottom panel's collapse toggle", () => {
        const { wrapper } = mountComponent("panel");
        expect(titles(wrapper)).toEqual([
            "Show Chats Panel",
            "Open in center view",
            "Dock to side panel",
            "Toggle panel",
            "Close panel",
        ]);
    });
});
