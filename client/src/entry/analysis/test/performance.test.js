import Components from "./components";
import LeakDetector from "jest-leak-detector";
import flushPromises from "flush-promises";
import { MemoryUsage } from "./framework/memory-usage";
import { createServer } from "./framework/fake-server";
import { enableLogging, disableLogging } from "./framework/log-level";

// increase test timeout
jest.setTimeout(30000);

// number of creation/destroy cycles
const n = 5;

// memory test helper
async function evaluate(name) {
    const memoryUsage = new MemoryUsage();
    const results = [memoryUsage.getDelta()];
    for (let i = 0; i < n; i++) {
        // component mounting
        let wrapper = Components[name]();
        await flushPromises();
        await wrapper.vm.$nextTick();
        const detector = new LeakDetector(wrapper);
        // memory usage
        wrapper.vm.$destroy();
        wrapper = null;
        // leak detector
        const isLeaking = await detector.isLeaking();
        expect(isLeaking).toBeFalsy();
        results.push(memoryUsage.getDelta());
    }
    console.log(name, results);
}

// performance analysis creates/destroys components and measures
// memory usage and leak behavior.
describe("Performance Analysis", () => {
    // build server and omit certain log-levels
    beforeEach(() => {
        disableLogging();
        createServer();
    });

    // restore log-level
    afterEach(() => {
        enableLogging();
    });

    // performance test case
    it("testing for memory usage", async () => {
        const name = "workflow/editor/index";
        await evaluate(name);
    });
});
