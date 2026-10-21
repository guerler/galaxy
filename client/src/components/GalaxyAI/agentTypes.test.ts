import { faMagic, faRobot } from "@fortawesome/free-solid-svg-icons";
import { describe, expect, it } from "vitest";

import { getAgentIcon } from "./agentTypes";

describe("agentTypes", () => {
    describe("getAgentIcon", () => {
        it("returns correct icon for known agent type", () => {
            expect(getAgentIcon("auto")).toBe(faMagic);
        });

        it("returns faRobot for unknown agent type", () => {
            expect(getAgentIcon("nonexistent")).toBe(faRobot);
        });

        it("returns faRobot for undefined", () => {
            expect(getAgentIcon(undefined)).toBe(faRobot);
        });

        it("returns faRobot for empty string", () => {
            expect(getAgentIcon("")).toBe(faRobot);
        });
    });
});
