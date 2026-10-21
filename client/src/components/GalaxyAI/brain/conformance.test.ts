import { afterEach, describe, expect, it } from "vitest";

import contract from "./conformance.json";
import { type BrainSession, hostBrain } from "./host";
import { ERRORS, METHODS, PROTOCOL_VERSION } from "./protocol";
import { flush, mockBrain } from "./testing";

/** Errors match by code: their message is the side's own words. */
const matchable = (message: any) => (message?.error ? { ...message, error: { code: message.error.code } } : message);

let hosts: Array<{ close(): void }> = [];
afterEach(() => {
    hosts.forEach((host) => host.close());
    hosts = [];
});

describe("the contract", () => {
    it("names the version, methods and errors protocol.ts does", () => {
        expect(contract.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(contract.methods).toEqual(METHODS);
        expect(contract.errors).toEqual(ERRORS);
    });
});

describe("the host, replaying the contract's sessions", () => {
    it.each(contract.sessions.filter((session) => session.checks.includes("host")).map((s) => [s.name, s] as const))(
        "%s",
        async (_, session) => {
            const brain = mockBrain();
            const ready: BrainSession[] = [];
            hosts.push(
                hostBrain(() => brain.frame, {
                    hostInfo: contract.hostInfo,
                    onReady: (given) => ready.push(given),
                    onActiveChanged: () => {},
                }),
            );
            let seen = 0;
            for (const [index, step] of session.messages.entries()) {
                const message = step.message as any;
                if (step.from === "brain") {
                    if (index === 0) {
                        brain.toWindow(message);
                    } else {
                        brain.send(message);
                    }
                } else {
                    // The host's own requests are its commands, which Galaxy gives through the session.
                    if (message.method === contract.methods.chatOpen) {
                        ready[0]!.open(message.params).catch(() => {});
                    } else if (message.method === contract.methods.chatAsk) {
                        ready[0]!.ask(message.params).catch(() => {});
                    }
                    await flush();
                    const got = brain.received[seen++];
                    expect(matchable(got?.message)).toEqual(matchable(message));
                    expect(got?.port).toBe(!!(step as { port?: boolean }).port);
                }
                await flush();
            }
            expect(brain.received).toHaveLength(seen);
        },
    );
});
