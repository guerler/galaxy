import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";

import { getRouter } from "./router";

vi.mock("@/onload/loadConfig", () => ({ getAppRoot: () => "/galaxy/" }));

async function resolve(path: string) {
    const router = getRouter(createMemoryHistory());
    await router.push(path);
    return router.currentRoute.value;
}

describe("embedded routes", () => {
    it("maps a history graph with its seed", async () => {
        const route = await resolve("/histories/b2/graph?seed_src=hda&seed_id=c3");
        const props = route.matched[0]!.props.default as (r: typeof route) => object;
        expect(props(route)).toEqual({ historyId: "b2", seedSrc: "hda", seedId: "c3" });
    });

    it.each(["/histories/view/graph", "/histories/b2", "/invocations/a1"])("shows %s as not found", async (path) => {
        const route = await resolve(path);
        expect(route.matched[0]!.path).toEqual("/:pathMatch(.*)*");
    });
});
