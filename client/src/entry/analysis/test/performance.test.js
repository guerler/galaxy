import Routes from "./routes";
import LeakDetector from "jest-leak-detector";
import flushPromises from "flush-promises";
import { MemoryUsage } from "./framework/memory-usage";
import { createServer } from "./framework/fake-server";
import { enableLogging, disableLogging } from "./framework/log-level";

// increase test timeout
jest.setTimeout(30000);

// number of creation/destroy cycles
const nCycles = 7;

// memory test helper
async function evaluate(name) {
    const memoryUsage = new MemoryUsage();
    const results = [memoryUsage.getDelta()];
    for (let i = 0; i < nCycles; i++) {
        // component mounting
        let wrapper = Routes[name]();
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

// use base route to normalize heap and garbage collector
async function reset() {
    let wrapper = Routes["/"]();
    const detector = new LeakDetector(wrapper);
    await detector.isLeaking();
}

// performance analysis creates/destroys routes and measures
// memory usage and leak behavior.
describe("Client Route Memory Usage in MB", () => {
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
    it("testing memory usage of routes (listed in index.js)", async () => {
        await reset();
        for (let route of Object.keys(Routes)) {
            await evaluate(route);
        }
    });
});
