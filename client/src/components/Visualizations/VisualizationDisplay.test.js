import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VisualizationDisplay from "./VisualizationDisplay.vue";

vi.mock("vue-router/composables", () => ({ onBeforeRouteLeave: vi.fn() }));
vi.mock("@/api", () => ({ GalaxyApi: () => ({ GET: async () => ({ data: null, error: null }) }) }));
// Replaced wholesale: the real frame builds an iframe and fetches the plugin over the network.
vi.mock("@/components/Visualizations/VisualizationFrame.vue", () => ({
    default: { name: "VisualizationFrame", render: (h) => h("div") },
}));

const FRAME = { name: "VisualizationFrame" };

let wrapper;

async function mountDisplay() {
    wrapper = mount(VisualizationDisplay, {
        propsData: { visualization: "example", datasetId: "d1" },
        stubs: { LoadingSpan: true, BAlert: true },
    });
    // The frame is rendered only once onMounted has resolved the config.
    await flushPromises();
    return wrapper;
}

const report = (payload) => wrapper.findComponent(FRAME).vm.$emit("change", payload);

/** The dialog the browser shows is `preventDefault()` on a cancelable unload event. */
function unloadIsBlocked() {
    return !window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
}

describe("VisualizationDisplay.vue", () => {
    beforeEach(() => {
        wrapper = undefined;
    });

    // Listeners live on the shared window, so a surviving component grades the next test.
    afterEach(() => {
        wrapper?.destroy();
    });

    it("does not warn before the visualization reports anything", async () => {
        await mountDisplay();
        expect(unloadIsBlocked()).toBe(false);
    });

    it("warns once the visualization reports an unsaved change", async () => {
        await mountDisplay();
        await report({ visualization_config: { a: 1 } });
        expect(unloadIsBlocked()).toBe(true);
    });

    it("stops warning once the visualization reports it saved", async () => {
        await mountDisplay();
        await report({ visualization_config: { a: 1 } });
        await report({ visualization_config: { a: 1 }, visualization_saved: true });
        expect(unloadIsBlocked()).toBe(false);
    });

    it("warns again after a change that follows a save", async () => {
        await mountDisplay();
        await report({ visualization_config: { a: 1 }, visualization_saved: true });
        await report({ visualization_config: { a: 2 } });
        expect(unloadIsBlocked()).toBe(true);
    });

    it("stops warning for a visualization that has been left", async () => {
        await mountDisplay();
        await report({ visualization_config: { a: 1 } });
        wrapper.destroy();
        expect(unloadIsBlocked()).toBe(false);
    });
});
