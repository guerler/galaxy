import Components from "./components";
import LeakDetector from "jest-leak-detector";
import flushPromises from "flush-promises";
import { MemoryUsage } from "./framework/memory-usage";
import { createServer } from "./framework/fake-server";
import { enableLogging, disableLogging } from "./framework/log-level";

// increase test timeout
jest.setTimeout(30000);

// number of creation/destroy cycles
const nCycles = 5;

// memory test helper
async function evaluate(name) {
    const memoryUsage = new MemoryUsage();
    const results = [memoryUsage.getDelta()];
    for (let i = 0; i < nCycles; i++) {
        // component mounting
        let wrapper = Components[name]();
        const detector = new LeakDetector(wrapper);
        await flushPromises();
        await wrapper.vm.$nextTick();
        // destroy component
        wrapper.vm.$destroy();
        wrapper = null;
        // evaluate leaks and memory usage
        const isLeaking = await detector.isLeaking();
        expect(isLeaking).toBeFalsy();
        results.push(memoryUsage.getDelta());
    }
    console.log(`${name}\t ${results}`);
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
        for (let componentRoute of Object.keys(Components)) {
            await evaluate(componentRoute);
        }
    });
});
