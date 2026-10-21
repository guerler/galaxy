import { vi } from "vitest";

import { PROTOCOL_VERSION } from "./protocol";

/**
 * A brain written as raw messages, so the wire contract is checked rather than this module's own
 * JSON-RPC code: it posts what a brain posts, on the window until the host hands it a port and on
 * the port after, and records what the host posts to it.
 */
export function mockBrain() {
    const received: Array<{ message: any; port: boolean }> = [];
    let port: MessagePort | undefined;
    const frame = Object.assign(new EventTarget(), {
        postMessage: vi.fn((message: unknown, _origin: string, transfer?: MessagePort[]) => {
            received.push({ message, port: !!transfer?.length });
            if (transfer?.[0]) {
                port = transfer[0];
                port.onmessage = (event) => received.push({ message: event.data, port: false });
            }
        }),
    }) as unknown as Window;
    /** Posts to the host's window, as the handshake goes. */
    const toWindow = (data: unknown, overrides: Partial<MessageEventInit> = {}) =>
        window.dispatchEvent(
            new MessageEvent("message", { data, origin: window.location.origin, source: frame as never, ...overrides }),
        );
    /** Posts on the session's port, as everything after the handshake goes. */
    const send = (data: unknown) => port!.postMessage(data);
    const initialize = (id = 1, capabilities: object = { chat: {} }) =>
        toWindow({
            jsonrpc: "2.0",
            id,
            method: "initialize",
            params: { protocolVersion: PROTOCOL_VERSION, clientInfo: { name: "mock", version: "0" }, capabilities },
        });
    const initialized = () => send({ jsonrpc: "2.0", method: "initialized" });
    /** Answers every request the host sent with `result`, or an error. */
    const answer = (outcome: object = { result: {} }) =>
        received
            .filter(({ message }) => message.method && message.id !== undefined)
            .forEach(({ message }) => send({ jsonrpc: "2.0", id: message.id, ...outcome }));
    return { frame, received, toWindow, send, initialize, initialized, answer, port: () => port };
}

/** Lets messages on a port arrive, which they do as tasks of their own. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
