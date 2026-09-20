import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { describe, expect, it, vi } from "vitest";

import MarkdownStandalone from "./MarkdownStandalone.vue";
import SectionWrapper from "./Sections/SectionWrapper.vue";

const localVue = getLocalVue();

function mountWith(content) {
    return mount(MarkdownStandalone, {
        propsData: { content },
        localVue,
        pinia: createTestingPinia({ createSpy: vi.fn }),
        stubs: { SectionWrapper: true },
    });
}

describe("MarkdownStandalone", () => {
    it("renders the content it was given", async () => {
        const wrapper = mountWith("# hello\n");
        await flushPromises();
        expect(wrapper.text()).toContain("hello");
    });

    it("re-renders when the host posts new content", async () => {
        const wrapper = mountWith("# first\n");
        await flushPromises();

        window.dispatchEvent(
            new MessageEvent("message", {
                data: { from: "galaxy-embed-host", type: "content", content: "# second\n" },
                origin: window.location.origin,
            }),
        );
        await flushPromises();
        expect(wrapper.text()).toContain("second");
        expect(wrapper.text()).not.toContain("first");
    });

    it("ignores messages from another origin", async () => {
        const wrapper = mountWith("# first\n");
        await flushPromises();

        window.dispatchEvent(
            new MessageEvent("message", {
                data: { from: "galaxy-embed-host", type: "content", content: "# injected\n" },
                origin: "https://elsewhere.example",
            }),
        );
        await flushPromises();
        expect(wrapper.text()).toContain("first");
    });

    it("forwards a cell's change to the host with the cell it came from", async () => {
        const posted = [];
        const parent = { postMessage: (m) => posted.push(m) };
        const original = Object.getOwnPropertyDescriptor(window, "parent");
        Object.defineProperty(window, "parent", { value: parent, configurable: true });

        try {
            const wrapper = mountWith("# one\n\n```vega\n{}\n```\n");
            await flushPromises();
            expect(posted.some((m) => m.type === "ready")).toBe(true);

            const sections = wrapper.findAllComponents(SectionWrapper);
            expect(sections.length).toBeGreaterThan(0);
            sections.at(sections.length - 1).vm.$emit("change", "{\"mark\":\"line\"}");
            await flushPromises();

            const change = posted.find((m) => m.type === "change");
            expect(change).toBeTruthy();
            expect(change.content).toBe("{\"mark\":\"line\"}");
            expect(change.index).toBe(sections.length - 1);
            expect(change.from).toBe("galaxy-embed");
        } finally {
            if (original) {
                Object.defineProperty(window, "parent", original);
            }
        }
    });
});
