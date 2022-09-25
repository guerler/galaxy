import { mount, createLocalVue, config } from "@vue/test-utils";
import Vuex from "vuex";

// Galaxy related
import store from "store";
import App from "../App.vue";
import { getRouter } from "../router";
import { getAppRoot } from "onload/loadConfig";
import { getGalaxyInstance } from "app";

// Leak detector related inputs
import LeakDetector from "jest-leak-detector";
import flushPromises from "flush-promises";
import { MemoryUsage } from "./framework/memory-usage";
import { createServer } from "./framework/fake-server";
import { enableLogging, disableLogging } from "./framework/log-level";

// mock modules
jest.mock("app");
jest.mock("onload/loadConfig");

// configure jest times
jest.useFakeTimers("modern");
jest.setSystemTime(new Date(2022, 1, 1));
jest.setTimeout(9999999);

// number of creation and disposal cycles
const nCycles = 0;
const Galaxy = {
    user: {
        id: "test",
        get: () => {},
    },
    config: {},
};

/** Evaluates cycles of creating and disposing components */
async function evaluateCycle(name) {
    const memoryUsage = new MemoryUsage();
    const results = [memoryUsage.getDelta()];
    for (let i = 0; i < nCycles; i++) {
        await evaluateRoute(name);
        results.push(memoryUsage.getDelta());
    }
    console.log(`${name}\t ${results}`);
}

/** Creates and disposes individual components */
async function evaluateRoute(name) {
    // component mounting
    let wrapper = Routes[name]();
    const detector = new LeakDetector(wrapper);
    await flushPromises();
    await wrapper.vm.$nextTick();
    // destroy component
    await wrapper.vm.$destroy();
    wrapper = null;
    // evaluate leaks and memory usage
    const isLeaking = await detector.isLeaking();
    expect(isLeaking).toBeFalsy();
}

/** This is a performance and memory usage analysis rather than a test. A range of routes is
 * visited leading to the creation and destruction of components while the heap usage is
 * continuously evaluated. */
describe("Client Route Memory Usage in MB", () => {
    let wrapper = null;

    // build server and omit certain log-levels
    beforeEach(() => {
        disableLogging();
        createServer();
        const localVue = createLocalVue();
        localVue.use(Vuex);
        const router = getRouter(Galaxy);
        wrapper = mount(App, {
            router,
            store,
            propsData: {
            },
            stub: {
                Masthead: true,
                RouterView: true,
            },
            localVue,
        });
    });

    // restore log-level
    afterEach(() => {
        enableLogging();
    });

    // performance test case
    it("testing memory usage of routes (listed in index.js)", async () => {
        getAppRoot.mockImplementation(() => "/");
        getGalaxyInstance.mockImplementation(() => Galaxy);
        //console.log(getGalaxyInstance());
        await wrapper.$router.push("/");
        const memoryUsage = new MemoryUsage();
        /*for (let route of Object.keys(Routes)) {
            await evaluateCycle(route);
        }*/
        console.log("Total usage: ", memoryUsage.getDelta());
    });
});
