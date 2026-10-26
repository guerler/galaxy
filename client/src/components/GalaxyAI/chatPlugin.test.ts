import { describe, expect, it } from "vitest";

import { agentReport, commandMessage } from "./chatPlugin";

describe("the chat plugin contract", () => {
    it("reads the reports an agent sends", () => {
        expect(agentReport({ channel: "galaxy-ai", type: "ready" })).toEqual({ type: "ready" });
        expect(agentReport({ channel: "galaxy-ai", type: "active", exchange_id: "a1" })).toEqual({
            type: "active",
            exchange_id: "a1",
        });
        expect(agentReport({ channel: "galaxy-ai", type: "active", exchange_id: null })).toEqual({
            type: "active",
            exchange_id: null,
        });
        expect(agentReport({ channel: "galaxy-ai", type: "unsaved", value: false })).toEqual({
            type: "unsaved",
            value: false,
        });
    });

    it("reads nothing from other messages", () => {
        expect(agentReport(null)).toBeNull();
        expect(agentReport("ready")).toBeNull();
        expect(agentReport({ type: "ready" })).toBeNull();
        expect(agentReport({ from: "galaxy-visualization", visualization_saved: true })).toBeNull();
        expect(agentReport({ channel: "galaxy-ai", type: "active", exchange_id: "" })).toBeNull();
        expect(agentReport({ channel: "galaxy-ai", type: "active", exchange_id: 7 })).toBeNull();
        expect(agentReport({ channel: "galaxy-ai", type: "unsaved", value: "no" })).toBeNull();
        expect(agentReport({ channel: "galaxy-ai", type: "open", exchange_id: "a1" })).toBeNull();
    });

    it("marks the commands Galaxy sends", () => {
        expect(commandMessage({ type: "ask", question: "Hi" })).toEqual({
            channel: "galaxy-ai",
            type: "ask",
            question: "Hi",
        });
    });
});
