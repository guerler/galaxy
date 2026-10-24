import { mount, type VueWrapper } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toast } from "@/composables/toast";
import { useChatStore } from "@/stores/chatStore";

import AiChatBrain from "./AiChatBrain.vue";

const PLUGIN = { href: "/static/plugins/visualizations/olit/static", entry_point: { attr: { src: "index.js" } } };

vi.mock("axios", () => ({ default: { get: vi.fn(async () => ({ data: PLUGIN })) } }));
vi.mock("@/onload/loadConfig", () => ({ getAppRoot: () => "/" }));
vi.mock("@/api/client", () => ({ GalaxyApi: () => ({ GET: vi.fn(async () => ({ data: [] })) }) }));

const mockPush = vi.fn();
const route = { path: "/" };
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ push: mockPush }) }));

/** GalaxyAI's chat plugin, through the frames every visualization is mounted in. */
let wrapper: VueWrapper;
beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    mockPush.mockClear();
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    wrapper = mount(AiChatBrain as object, { propsData: { plugin: "olit" }, attachTo: document.body });
    await flushPromises();
});

afterEach(() => {
    wrapper.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const frame = (id = "galaxy_ai_chat") => document.getElementById(id) as HTMLIFrameElement | null;
const configOf = (id?: string) =>
    JSON.parse(frame(id)!.contentDocument!.getElementById("app")!.getAttribute("data-incoming")!).visualization_config;
const fromPlugin = (data: object) =>
    window.dispatchEvent(
        new MessageEvent("message", {
            data: { from: "galaxy-visualization", ...data },
            source: frame()!.contentWindow,
        }),
    );

describe("GalaxyAI's chat plugin", () => {
    it("is mounted as the chat", () => {
        expect(configOf()).toEqual({ view: "chat" });
    });

    it("is mounted anew for each command, with the config that says what to show", async () => {
        const store = useChatStore();
        const first = frame();
        store.openChat("a1");
        await flushPromises();
        expect(frame()).not.toBe(first);
        expect(configOf()).toEqual({ view: "chat", exchange_id: "a1" });
        store.askChat("Count my reads");
        await flushPromises();
        expect(configOf()).toEqual({ view: "chat", question: "Count my reads" });
    });

    it("takes the chat the plugin reports, and keeps it for the next mount without mounting it anew", async () => {
        const store = useChatStore();
        vi.useFakeTimers();
        const shown = frame();
        fromPlugin({ visualization_config: { view: "chat", exchange_id: "c1" } });
        await vi.advanceTimersByTimeAsync(400);
        expect(store.activeChatId).toBe("c1");
        expect(store.chatConfig).toEqual({ view: "chat", exchange_id: "c1" });
        expect(frame()).toBe(shown);
        expect(store.chatMounts).toBe(0);
        // Reported again, as the chat it already shows: still the same mount.
        store.openChat("c1");
        fromPlugin({ visualization_config: { view: "chat", exchange_id: "c1" } });
        await vi.advanceTimersByTimeAsync(400);
        expect(frame()).toBe(shown);
        fromPlugin({ visualization_config: { view: "chat" } });
        await vi.advanceTimersByTimeAsync(400);
        expect(store.activeChatId).toBeNull();
        expect(frame()).toBe(shown);
    });

    it("hears nothing more from a plugin a command replaced", async () => {
        const store = useChatStore();
        vi.useFakeTimers();
        fromPlugin({ visualization_config: { view: "chat", exchange_id: "stale" } });
        store.askChat("Count my reads");
        await vi.advanceTimersByTimeAsync(400);
        expect(store.activeChatId).toBeNull();
    });

    it("follows the plugin's saved state for the warnings", () => {
        const store = useChatStore();
        fromPlugin({ visualization_saved: false });
        expect(store.unsaved).toBe(true);
        fromPlugin({ visualization_saved: true });
        expect(store.unsaved).toBe(false);
    });

    it("mounts the pane apart only while docked, and brings it into view when the plugin asks", async () => {
        const store = useChatStore();
        expect(frame("galaxy_ai_pane")).toBeNull();
        fromPlugin({ show_pane: true });
        expect(mockPush).not.toHaveBeenCalled();
        store.dockChat("right");
        await flushPromises();
        expect(configOf("galaxy_ai_pane")).toEqual({ view: "pane" });
        fromPlugin({ show_pane: true });
        expect(mockPush).toHaveBeenCalledWith("/artifacts");
    });

    it("mounts a plugin whose page went away anew, saying unsaved changes may be gone", async () => {
        const store = useChatStore();
        const warning = vi.spyOn(Toast, "warning").mockImplementation(() => undefined as never);
        fromPlugin({ visualization_saved: false });
        const gone = frame();
        gone!.contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        await flushPromises();
        expect(warning).toHaveBeenCalledTimes(1);
        expect(store.chatMounts).toBe(1);
        expect(frame()).not.toBe(gone);
    });

    it("takes a page that goes with its command, or with Galaxy's page, for no reload", async () => {
        const store = useChatStore();
        const replaced = frame()!.contentWindow!;
        store.openChat("a1");
        await flushPromises();
        replaced.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        expect(store.chatMounts).toBe(1);
        window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        frame()!.contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        expect(store.chatMounts).toBe(1);
    });
});
