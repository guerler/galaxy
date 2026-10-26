import { describe, expect, it } from "vitest";

import { activeChat, commandMessage } from "./chatPlugin";

describe("the chat plugin contract", () => {
    it("reads the chat a reported config names", () => {
        expect(activeChat({ exchange_id: "a1" })).toBe("a1");
        expect(activeChat({ exchange_id: null })).toBeNull();
    });

    it("reads no chat from other configs", () => {
        expect(activeChat(null)).toBeUndefined();
        expect(activeChat({})).toBeUndefined();
        expect(activeChat({ exchange_id: "" })).toBeUndefined();
        expect(activeChat({ exchange_id: 7 })).toBeUndefined();
        expect(activeChat({ question: "Hi" })).toBeUndefined();
    });

    it("marks the commands Galaxy sends", () => {
        expect(commandMessage({ type: "ask", question: "Hi" })).toEqual({
            from: "galaxy",
            type: "ask",
            question: "Hi",
        });
    });
});
