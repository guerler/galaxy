import { getFilters, getQueryDict, testFilters } from "./historyItemsFiltering";

const filterTexts = [
    "hid>10 hid<100 create-time>'January 1, 2021' update-time<\"January 1, 2022\" state=success",
    "hid>10 hid<100 create_time>\"January 1, 2021\" update_time-lt='January 1, 2022' state=success",
];
describe("historyItemsFiltering", () => {
    test("parse filter search text to filter entries", () => {
        const filters = getFilters("name of item");
        expect(filters[0][0]).toBe("name");
        expect(filters[0][1]).toBe("name of item");
        const queryDict = getQueryDict("name of item");
        expect(queryDict["name-contains"]).toBe("name of item");
    });
    test("parse filter search text to filter entries", () => {
        filterTexts.forEach((filterText) => {
            const filters = getFilters(filterText);
            expect(filters[0][0]).toBe("hid_gt");
            expect(filters[0][1]).toBe("10");
            expect(filters[1][0]).toBe("hid_lt");
            expect(filters[1][1]).toBe("100");
            expect(filters[2][0]).toBe("create_time_gt");
            expect(filters[2][1]).toBe("January 1, 2021");
            expect(filters[3][0]).toBe("update_time_lt");
            expect(filters[3][1]).toBe("January 1, 2022");
            expect(filters[4][0]).toBe("state");
            expect(filters[4][1]).toBe("success");
        });
    });
    test("parse filter search text to query dictionary", () => {
        filterTexts.forEach((filterText) => {
            const queryDict = getQueryDict(filterText);
            expect(queryDict["hid-gt"]).toBe("10");
            expect(queryDict["hid-lt"]).toBe("100");
            expect(queryDict["create_time-gt"]).toBe(1609477200);
            expect(queryDict["update_time-lt"]).toBe(1641013200);
            expect(queryDict["state-eq"]).toBe("success");
        });
    });
    test("test filtering", () => {
        filterTexts.forEach((filterText) => {
            const filters = getFilters(filterText);
            const item = {
                hid: 11,
                create_time: "June 1, 2021",
                update_time: "June 1, 2021",
                state: "success",
            };
            expect(testFilters(filters, { ...item })).toBe(true);
            expect(testFilters(filters, { ...item, hid: 10 })).toBe(false);
            expect(testFilters(filters, { ...item, hid: 100 })).toBe(false);
            expect(testFilters(filters, { ...item, hid: 99 })).toBe(true);
            expect(testFilters(filters, { ...item, status: "error" })).toBe(true);
            expect(testFilters(filters, { ...item, create_time: "January 1, 2021" })).toBe(false);
            expect(testFilters(filters, { ...item, create_time: "January 2, 2021" })).toBe(true);
            expect(testFilters(filters, { ...item, update_time: "January 1, 2022" })).toBe(false);
            expect(testFilters(filters, { ...item, update_time: "December 31, 2021" })).toBe(true);
        });
    });
});
