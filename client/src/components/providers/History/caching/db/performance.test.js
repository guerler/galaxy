import { cacheContent } from "./promises";

describe("history content operators and functions", () => {
    const testDoc = {
        some: "test_data",
        more: "test_data",
    };
    describe("cacheContent", () => {
        jest.setTimeout(100000);
        it("should cache a single document", async () => {
            for (let i = 0; i < 10000; i++) {
                const cacheSummary = await cacheContent(testDoc);
                expect(cacheSummary).toBeDefined;
            }
        });
    });
});
