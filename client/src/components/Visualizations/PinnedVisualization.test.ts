import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import PinnedVisualization from "./PinnedVisualization.vue";
import VisualizationSlot from "./VisualizationSlot.vue";

let frameMounts = 0;
vi.mock("./VisualizationFrame.vue", () => ({
    default: defineComponent({
        props: { name: String, config: Object, frameId: String },
        setup(props) {
            frameMounts++;
            return () => h("iframe", { id: props.frameId });
        },
    }),
}));

/** Animation frames run only when the test says so. */
let pending: FrameRequestCallback[] = [];
const runFrame = () => pending.splice(0).forEach((callback) => callback(0));

/** A page with a pinned visualization and a slot that can move between two places. */
const Page = defineComponent({
    props: { place: { type: String, default: "right" } },
    setup(props) {
        return () =>
            h("div", [
                h(PinnedVisualization, { name: "chat", frameId: "galaxy_ai_chat" }),
                props.place === "right" ? h("div", { class: "right" }, [h(VisualizationSlot, { name: "chat" })]) : null,
                props.place === "bottom"
                    ? h("div", { class: "bottom" }, [h(VisualizationSlot, { name: "chat" })])
                    : null,
            ]);
    },
});

function boxOf(element: Element, box: { top: number; left: number; width: number; height: number }) {
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ ...box, right: 0, bottom: 0, x: 0, y: 0 } as DOMRect);
}

describe("a pinned visualization", () => {
    beforeEach(() => {
        frameMounts = 0;
        pending = [];
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => pending.push(callback));
        vi.stubGlobal("cancelAnimationFrame", () => {});
    });
    afterEach(() => vi.unstubAllGlobals());

    it("is drawn over its slot, and keeps the same frame as the slot moves", async () => {
        const place = ref("right");
        const wrapper = mount(
            defineComponent(() => () => h(Page, { place: place.value })),
            { attachTo: document.body },
        );
        boxOf(wrapper.find(".right .visualization-slot").element, { top: 10, left: 600, width: 300, height: 500 });
        runFrame();
        await nextTick();
        const pinned = wrapper.find(".pinned-visualization");
        expect(pinned.attributes("style")).toContain("left: 600px");
        expect(pinned.classes()).not.toContain("pinned-visualization-hidden");

        place.value = "bottom";
        await nextTick();
        boxOf(wrapper.find(".bottom .visualization-slot").element, { top: 400, left: 0, width: 900, height: 300 });
        runFrame();
        await nextTick();
        expect(pinned.attributes("style")).toContain("top: 400px");
        expect(frameMounts).toBe(1);
        wrapper.unmount();
    });

    it("is not mounted until a slot first shows it", async () => {
        const place = ref("none");
        const wrapper = mount(
            defineComponent(() => () => h(Page, { place: place.value })),
            { attachTo: document.body },
        );
        await nextTick();
        expect(frameMounts).toBe(0);
        place.value = "right";
        await nextTick();
        expect(frameMounts).toBe(1);
        wrapper.unmount();
    });

    it("hides without unmounting while no slot is shown, keeping its last size", async () => {
        const place = ref("right");
        const wrapper = mount(
            defineComponent(() => () => h(Page, { place: place.value })),
            { attachTo: document.body },
        );
        boxOf(wrapper.find(".right .visualization-slot").element, { top: 10, left: 600, width: 300, height: 500 });
        runFrame();
        await nextTick();
        place.value = "none";
        await nextTick();
        runFrame();
        await nextTick();
        const pinned = wrapper.find(".pinned-visualization");
        expect(pinned.classes()).toContain("pinned-visualization-hidden");
        expect(pinned.attributes("style")).toContain("width: 300px");
        expect(frameMounts).toBe(1);
        wrapper.unmount();
    });
});
