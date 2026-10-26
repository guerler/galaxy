import { mount, type VueWrapper } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";

import { useChatStore } from "@/stores/chatStore";
import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

import AiChatBrain from "./AiChatBrain.vue";
import VisualizationSlot from "@/components/Visualizations/VisualizationSlot.vue";

const PLUGIN = { href: "/static/plugins/visualizations/fixture/static", entry_point: { attr: { src: "index.js" } } };
const CONFIG = { ai_chat_plugin: "fixture" };

vi.mock("axios", () => ({ default: { get: vi.fn(async () => ({ data: PLUGIN })) } }));
vi.mock("@/onload/loadConfig", () => ({ getAppRoot: () => "/" }));
vi.mock("@/api/client", () => ({
    GalaxyApi: () => ({ GET: vi.fn(async (path: string) => ({ data: path === "/api/configuration" ? CONFIG : [] })) }),
}));

let wrapper: VueWrapper;
const place = ref("center");

beforeEach(async () => {
    setActivePinia(createPinia());
    useConfigStore().setConfiguration(CONFIG);
    useUserStore().currentUser = { id: "u1", email: "u1@example.org" } as never;
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    place.value = "center";
    // One slot at a time, as the chat moves between the center and the docks.
    const Places = defineComponent({
        setup: () => () =>
            h("div", [
                h(AiChatBrain, { plugin: "fixture" }),
                h("div", { class: place.value, key: place.value }, [h(VisualizationSlot, { name: "fixture" })]),
            ]),
    });
    wrapper = mount(Places as object, { attachTo: document.body });
    await flushPromises();
});

afterEach(() => {
    wrapper.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const frame = () => document.getElementById("galaxy_ai_chat") as HTMLIFrameElement;
const configOf = () =>
    JSON.parse(frame().contentDocument!.getElementById("app")!.getAttribute("data-incoming")!).visualization_config;
/** Posts as the plugin does: a Charts message to its own window */
const report = (data: object, target: Window | null = frame().contentWindow, origin = window.location.origin) =>
    target!.dispatchEvent(
        new MessageEvent("message", { data: { from: "galaxy-visualization", ...data }, origin, source: target }),
    );
/** Records the commands Galaxy posts into the plugin's frame */
function commands() {
    return vi.spyOn(frame().contentWindow!, "postMessage").mockImplementation(() => {});
}
/** Waits out the debounce Galaxy applies to a config change */
const debounced = () => new Promise((resolve) => setTimeout(resolve, 350));

describe("the chat plugin's host", () => {
    it("mounts the plugin once as the chat", () => {
        expect(configOf()).toEqual({ view: "chat" });
        expect(useChatStore().chatMounts).toBe(0);
    });

    it("takes the plugin's first message as ready", () => {
        expect(useChatStore().agentState).toBe("loading");
        report({ visualization_saved: true });
        expect(useChatStore().agentState).toBe("ready");
    });

    it("sends commands into the frame in order once the plugin is ready, without mounting it again", async () => {
        const store = useChatStore();
        const shown = frame();
        const into = commands();
        store.openChat("a1");
        store.askChat("Count my reads");
        expect(into).not.toHaveBeenCalled();
        report({ visualization_saved: true });
        store.askChat("And plot them");
        expect(into.mock.calls).toEqual([
            [{ from: "galaxy", type: "open", exchange_id: "a1" }, window.location.origin],
            [{ from: "galaxy", type: "ask", question: "Count my reads" }, window.location.origin],
            [{ from: "galaxy", type: "ask", question: "And plot them" }, window.location.origin],
        ]);
        await flushPromises();
        expect(frame()).toBe(shown);
    });

    it("takes the chat shown and the saved state from Charts messages", async () => {
        const store = useChatStore();
        report({ visualization_saved: false });
        expect(store.unsaved).toBe(true);
        report({ visualization_config: { exchange_id: "c1" }, visualization_saved: true });
        await debounced();
        expect(store.activeChatId).toBe("c1");
        expect(store.unsaved).toBe(false);
        report({ visualization_config: { exchange_id: 7 } });
        await debounced();
        expect(store.activeChatId).toBe("c1");
    });

    it("takes no message from another origin, from another frame, or for Galaxy", () => {
        const into = commands();
        useChatStore().askChat("Hi");
        report({ visualization_saved: true }, frame().contentWindow, "https://example.org");
        const other = document.body.appendChild(document.createElement("iframe"));
        report({ visualization_saved: true }, other.contentWindow);
        other.remove();
        window.dispatchEvent(
            new MessageEvent("message", {
                data: { from: "galaxy-visualization", visualization_saved: true },
                origin: window.location.origin,
                source: window,
            }),
        );
        frame().contentWindow!.dispatchEvent(
            new MessageEvent("message", { data: { from: "galaxy", type: "ask", question: "Hi" } }),
        );
        expect(useChatStore().agentState).toBe("loading");
        expect(into).not.toHaveBeenCalled();
    });

    it("gives a question once, even when the plugin reloads or reports it back", async () => {
        const store = useChatStore();
        const into = commands();
        store.askChat("Count my reads");
        report({ visualization_saved: true });
        expect(into).toHaveBeenCalledTimes(1);
        report({ visualization_config: { question: "Count my reads", exchange_id: null }, visualization_saved: false });
        await debounced();
        frame().contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        await flushPromises();
        expect(configOf()).toEqual({ view: "chat" });
        const again = commands();
        report({ visualization_saved: true });
        expect(again).not.toHaveBeenCalled();
    });

    it("says the plugin did not start when it sends no message", async () => {
        vi.useFakeTimers();
        useChatStore().chatUnloaded();
        await flushPromises();
        await vi.advanceTimersByTimeAsync(29000);
        expect(useChatStore().agentState).toBe("loading");
        await vi.advanceTimersByTimeAsync(2000);
        expect(useChatStore().agentState).toBe("failed");
    });

    it("stays one running frame as the chat moves between places", async () => {
        const store = useChatStore();
        const running = frame();
        (running.contentWindow as unknown as Record<string, string>).__running = "a turn in flight";
        for (const where of ["right", "bottom", "center"]) {
            place.value = where;
            await flushPromises();
            expect(frame()).toBe(running);
            expect((frame().contentWindow as unknown as Record<string, string>).__running).toBe("a turn in flight");
        }
        expect(store.chatMounts).toBe(0);
        expect(document.querySelectorAll("iframe")).toHaveLength(1);
    });

    it("mounts the plugin again on its chat when its page goes away", async () => {
        const store = useChatStore();
        report({ visualization_config: { exchange_id: "c1" }, visualization_saved: true });
        await debounced();
        const gone = frame();
        gone.contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        await flushPromises();
        expect(store.chatMounts).toBe(1);
        expect(store.agentState).toBe("loading");
        expect(frame()).not.toBe(gone);
        expect(configOf()).toEqual({ view: "chat", exchange_id: "c1" });
        report({ visualization_saved: true });
        expect(store.agentState).toBe("ready");
    });

    it("takes nothing more from a frame that was replaced", async () => {
        const store = useChatStore();
        report({ visualization_saved: true });
        const oldWindow = frame().contentWindow;
        oldWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        await flushPromises();
        report({ visualization_config: { exchange_id: "stale" }, visualization_saved: true }, oldWindow);
        await debounced();
        expect(store.activeChatId).toBeNull();
        expect(store.agentState).toBe("loading");
        report({ visualization_config: { exchange_id: "c1" }, visualization_saved: true });
        await debounced();
        expect(store.activeChatId).toBe("c1");
    });

    it("leaves the frame alone once Galaxy's page goes", () => {
        window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        frame().contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        expect(useChatStore().chatMounts).toBe(0);
    });

    it("stops listening once unmounted", async () => {
        const store = useChatStore();
        const source = frame().contentWindow;
        wrapper.unmount();
        report({ visualization_config: { exchange_id: "late" }, visualization_saved: false }, source);
        await debounced();
        expect(store.activeChatId).toBeNull();
        expect(store.agentState).toBe("loading");
        wrapper = mount(defineComponent({ render: () => h("div") }) as object);
    });
});
