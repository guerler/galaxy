import { afterEach, describe, expect, it, vi } from "vitest";

import { type BrainSession, hostBrain, type HostOptions } from "./host";
import { PROTOCOL_VERSION } from "./protocol";
import { flush, mockBrain } from "./testing";

let hosts: Array<{ close(): void }> = [];
afterEach(() => {
    hosts.forEach((host) => host.close());
    hosts = [];
    vi.useRealTimers();
});

function host(brain: ReturnType<typeof mockBrain>, options: Partial<HostOptions> = {}) {
    const ready: BrainSession[] = [];
    const active: Array<string | null> = [];
    const onClosed = vi.fn();
    const onUnloaded = vi.fn();
    hosts.push(
        hostBrain(() => brain.frame, {
            hostInfo: { name: "galaxy", version: "test" },
            onReady: (session) => ready.push(session),
            onActiveChanged: ({ exchange_id }) => active.push(exchange_id),
            onClosed,
            onUnloaded,
            ...options,
        }),
    );
    return { ready, active, onClosed, onUnloaded };
}

describe("the host's handshake", () => {
    it("answers initialize into the frame with the session's port, and is ready once initialized", async () => {
        const brain = mockBrain();
        const { ready } = host(brain);
        brain.initialize();
        expect(brain.received).toEqual([
            {
                port: true,
                message: {
                    jsonrpc: "2.0",
                    id: 1,
                    result: {
                        protocolVersion: PROTOCOL_VERSION,
                        hostInfo: { name: "galaxy", version: "test" },
                        capabilities: { chat: { unsaved: {} } },
                    },
                },
            },
        ]);
        expect(ready).toHaveLength(0);
        brain.initialized();
        await flush();
        expect(ready.map((session) => session.info)).toEqual([{ name: "mock", version: "0" }]);
    });

    it("gives no commands to a brain that does not take part in chat", async () => {
        const brain = mockBrain();
        const { ready } = host(brain);
        brain.initialize(1, {});
        brain.initialized();
        await flush();
        expect(ready).toHaveLength(0);
    });

    it("ignores other origins, other frames, and messages that are not JSON-RPC", async () => {
        const brain = mockBrain();
        const { ready } = host(brain);
        brain.initialize();
        brain.received.length = 0;
        const initialize = { jsonrpc: "2.0", id: 2, method: "initialize", params: {} };
        brain.toWindow(initialize, { origin: "https://elsewhere" });
        brain.toWindow(initialize, { source: mockBrain().frame as never });
        brain.toWindow({ from: "galaxy-visualization", visualization_saved: true });
        brain.toWindow({ jsonrpc: "2.0", method: "initialized" });
        await flush();
        expect(brain.received).toEqual([]);
        expect(ready).toHaveLength(0);
    });

    it("takes an initialize that WebKit says came from the host's own window", () => {
        const brain = mockBrain();
        host(brain);
        brain.toWindow(
            {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: PROTOCOL_VERSION,
                    clientInfo: { name: "mock", version: "0" },
                    capabilities: {},
                },
            },
            { source: window as never },
        );
        expect(brain.received).toMatchObject([{ port: true, message: { id: 1, result: {} } }]);
    });
});

describe("a session", () => {
    async function readyBrain(options: Partial<HostOptions> = {}) {
        const brain = mockBrain();
        const state = host(brain, options);
        brain.initialize();
        brain.initialized();
        await flush();
        brain.received.length = 0;
        return { brain, ...state, session: state.ready[0]! };
    }

    it("sends commands as requests on the port, settled by the brain's acknowledgement", async () => {
        const { brain, session } = await readyBrain();
        const opened = session.open({ exchange_id: "c1" });
        const asked = session.ask({ question: "How many?" });
        await flush();
        expect(brain.received.map(({ message }) => message)).toEqual([
            { jsonrpc: "2.0", id: 1, method: "chat/open", params: { exchange_id: "c1" } },
            { jsonrpc: "2.0", id: 2, method: "chat/ask", params: { question: "How many?" } },
        ]);
        brain.answer();
        await expect(Promise.all([opened, asked])).resolves.toEqual([undefined, undefined]);
    });

    it("fails a command the brain refuses, or one it never answers", async () => {
        const { brain, session } = await readyBrain({ timeoutMs: 50 });
        const refused = session.open({ exchange_id: "c1" });
        await flush();
        brain.answer({ error: { code: -32602, message: "no such chat" } });
        await expect(refused).rejects.toThrow("no such chat");
        await expect(session.ask({ question: "q" })).rejects.toThrow(/no response within 50 ms/);
    });

    it("reports the active conversation, and ignores a malformed report", async () => {
        const { brain, active } = await readyBrain();
        brain.send({ jsonrpc: "2.0", method: "chat/activeChanged", params: { exchange_id: "c1" } });
        brain.send({ jsonrpc: "2.0", method: "chat/activeChanged", params: { exchange_id: null } });
        brain.send({ jsonrpc: "2.0", method: "chat/activeChanged", params: { exchange_id: 3 } });
        brain.send({ jsonrpc: "2.0", method: "chat/somethingNew", params: {} });
        await flush();
        expect(active).toEqual(["c1", null]);
    });

    it("reports unsaved changes from a brain that declared them, and ignores them from one that did not", async () => {
        const unsaved: boolean[] = [];
        const declaring = mockBrain();
        host(declaring, { onUnsavedChanged: (params) => unsaved.push(params.unsaved) });
        declaring.initialize(1, { chat: { unsaved: {} } });
        declaring.send({ jsonrpc: "2.0", method: "chat/unsavedChanged", params: { unsaved: true } });
        declaring.initialized();
        declaring.send({ jsonrpc: "2.0", method: "chat/unsavedChanged", params: { unsaved: false } });
        declaring.send({ jsonrpc: "2.0", method: "chat/unsavedChanged", params: { unsaved: true } });
        declaring.send({ jsonrpc: "2.0", method: "chat/unsavedChanged", params: { unsaved: "yes" } });
        const silent = mockBrain();
        host(silent, { onUnsavedChanged: (params) => unsaved.push(params.unsaved) });
        silent.initialize();
        silent.initialized();
        silent.send({ jsonrpc: "2.0", method: "chat/unsavedChanged", params: { unsaved: true } });
        await flush();
        expect(unsaved).toEqual([false, true]);
    });

    it("ends when the brain loads again: pending commands fail, the old port is shut, the new brain is ready afresh", async () => {
        const { brain, session, ready, active, onClosed, onUnloaded } = await readyBrain();
        const pending = session.open({ exchange_id: "c1" });
        const old = brain.port()!;
        brain.initialize();
        await expect(pending).rejects.toThrow("The brain loaded again.");
        expect(onClosed).toHaveBeenCalledTimes(1);
        old.postMessage({ jsonrpc: "2.0", method: "chat/activeChanged", params: { exchange_id: "stale" } });
        brain.initialized();
        await flush();
        expect(ready).toHaveLength(2);
        expect(active).toEqual([]);
        expect(onUnloaded).not.toHaveBeenCalled();
    });

    it("ends when the brain's page goes away, and asks for the brain to be mounted again", async () => {
        const { brain, session, onClosed, onUnloaded } = await readyBrain();
        const pending = session.ask({ question: "q" });
        brain.frame.dispatchEvent(Object.assign(new Event("pagehide"), { persisted: false }));
        await expect(pending).rejects.toThrow("The brain's page went away.");
        expect(onClosed).toHaveBeenCalledTimes(1);
        expect(onUnloaded).toHaveBeenCalledTimes(1);
    });

    it("ends when Galaxy's page goes away, and does not take the brain's going after it for a reload", async () => {
        const { brain, onClosed, onUnloaded } = await readyBrain();
        window.dispatchEvent(Object.assign(new Event("pagehide"), { persisted: false }));
        brain.frame.dispatchEvent(Object.assign(new Event("pagehide"), { persisted: false }));
        expect(onClosed).toHaveBeenCalledTimes(1);
        expect(onUnloaded).not.toHaveBeenCalled();
    });

    it("keeps the session of a page that goes into the back-forward cache with Galaxy's", async () => {
        const { brain, onClosed } = await readyBrain();
        brain.frame.dispatchEvent(Object.assign(new Event("pagehide"), { persisted: true }));
        expect(onClosed).not.toHaveBeenCalled();
    });

    it("stops when the host closes it, and does not take the page going away after for a reload", async () => {
        const { brain, session, active, onUnloaded } = await readyBrain();
        const pending = session.ask({ question: "q" });
        hosts.pop()!.close();
        await expect(pending).rejects.toThrow("The host closed the brain.");
        brain.frame.dispatchEvent(Object.assign(new Event("pagehide"), { persisted: false }));
        brain.toWindow({ jsonrpc: "2.0", method: "chat/activeChanged", params: { exchange_id: "c1" } });
        await flush();
        expect(active).toEqual([]);
        expect(onUnloaded).not.toHaveBeenCalled();
    });
});
