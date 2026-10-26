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
const toHost = (data: object, source: Window | null = frame().contentWindow, origin = window.location.origin) =>
    window.dispatchEvent(new MessageEvent("message", { data: { channel: "galaxy-ai", ...data }, source, origin }));

/** Connects as the plugin: reports ready, takes the port Galaxy sends into the frame, and records commands */
function connect(source: Window | null = frame().contentWindow) {
    const into = vi.spyOn(frame().contentWindow!, "postMessage").mockImplementation(() => {});
    toHost({ type: "ready" }, source);
    const [message, origin, transfer] = (into.mock.calls[0] ?? []) as unknown as [object, string, MessagePort[]];
    const port = transfer?.[0];
    const commands: object[] = [];
    if (port) {
        port.onmessage = (event) => commands.push(event.data);
    }
    const report = async (data: object) => {
        port!.postMessage({ channel: "galaxy-ai", ...data });
        await new Promise((resolve) => setTimeout(resolve, 10));
    };
    return { message, origin, port, commands, report };
}
const delivered = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("the chat plugin's host", () => {
    it("mounts the plugin once as the chat", () => {
        expect(configOf()).toEqual({ view: "chat" });
        expect(useChatStore().chatMounts).toBe(0);
    });

    it("hands the plugin a port into its frame once it reports ready", () => {
        const { message, origin, port } = connect();
        expect(message).toEqual({ channel: "galaxy-ai", type: "connect" });
        expect(origin).toBe(window.location.origin);
        expect(typeof port?.postMessage).toBe("function");
        expect(useChatStore().agentState).toBe("ready");
    });

    it("sends commands over the port in order once the plugin is connected, without mounting it again", async () => {
        const store = useChatStore();
        const shown = frame();
        store.openChat("a1");
        store.askChat("Count my reads");
        const { commands } = connect();
        store.askChat("And plot them");
        await delivered();
        expect(commands).toEqual([
            { channel: "galaxy-ai", type: "open", exchange_id: "a1" },
            { channel: "galaxy-ai", type: "ask", question: "Count my reads" },
            { channel: "galaxy-ai", type: "ask", question: "And plot them" },
        ]);
        await flushPromises();
        expect(frame()).toBe(shown);
    });

    it("takes reports over the port", async () => {
        const store = useChatStore();
        const { report } = connect();
        await report({ type: "unsaved", value: "yes" });
        expect(store.unsaved).toBe(false);
        await report({ type: "active", exchange_id: "c1" });
        await report({ type: "unsaved", value: true });
        expect(store.activeChatId).toBe("c1");
        expect(store.unsaved).toBe(true);
    });

    it("takes ready from its frame, or from Galaxy's window as WebKit reports it", () => {
        expect(typeof connect(window).port?.postMessage).toBe("function");
    });

    it("connects no other frame, origin or second ready", () => {
        const other = document.body.appendChild(document.createElement("iframe"));
        expect(connect(other.contentWindow).port).toBeUndefined();
        other.remove();
        const into = vi.spyOn(frame().contentWindow!, "postMessage").mockImplementation(() => {});
        toHost({ type: "ready" }, frame().contentWindow, "https://example.org");
        toHost({ type: "active", exchange_id: "c1" });
        expect(into).not.toHaveBeenCalled();
        expect(useChatStore().agentState).toBe("loading");
        toHost({ type: "ready" });
        toHost({ type: "ready" });
        expect(into).toHaveBeenCalledTimes(1);
    });

    it("says the plugin did not start when it never reports ready", async () => {
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
        await connect().report({ type: "active", exchange_id: "c1" });
        const gone = frame();
        gone.contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        await flushPromises();
        expect(store.chatMounts).toBe(1);
        expect(frame()).not.toBe(gone);
        expect(configOf()).toEqual({ view: "chat", exchange_id: "c1" });
        expect(typeof connect().port?.postMessage).toBe("function");
    });

    it("takes nothing more from a frame that was replaced", async () => {
        const store = useChatStore();
        const old = connect();
        const oldWindow = frame().contentWindow;
        oldWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        await flushPromises();
        await old.report({ type: "active", exchange_id: "stale" });
        toHost({ type: "ready" }, oldWindow);
        expect(store.activeChatId).toBeNull();
        expect(store.agentState).toBe("loading");
        const current = connect();
        await current.report({ type: "active", exchange_id: "c1" });
        expect(store.activeChatId).toBe("c1");
    });

    it("leaves the frame alone once Galaxy's page goes", () => {
        window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        frame().contentWindow!.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
        expect(useChatStore().chatMounts).toBe(0);
    });

    it("stops listening once unmounted", async () => {
        const store = useChatStore();
        const { report } = connect();
        const source = frame().contentWindow;
        wrapper.unmount();
        await report({ type: "active", exchange_id: "late" });
        toHost({ type: "ready" }, source);
        expect(store.activeChatId).toBeNull();
        wrapper = mount(defineComponent({ render: () => h("div") }) as object);
    });
});
