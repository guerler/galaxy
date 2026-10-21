/**
 * One side of a JSON-RPC 2.0 conversation over any transport: requests with ids and one response
 * each, notifications without. Knows nothing of Galaxy or of what is said; see `protocol.ts`.
 */
import { ERRORS } from "./protocol";

export type Message = Record<string, unknown>;

/** An error for the other side, sent as a JSON-RPC error object. */
export class RpcError extends Error {
    constructor(
        readonly code: number,
        message: string,
        readonly data?: unknown,
    ) {
        super(message);
    }
}

export type RequestHandler = (params: unknown) => unknown;
export type NotificationHandler = (params: unknown) => void;

export interface PeerOptions {
    /** Requests this side answers, by method; any other request is answered with method not found. */
    requests?: Record<string, RequestHandler>;
    /** Notifications this side takes, by method; any other is ignored. */
    notifications?: Record<string, NotificationHandler>;
    /** How long a request of this side waits for its response, unless the request says otherwise. */
    timeoutMs?: number;
}

export interface Peer {
    /** Hands the peer a message from the other side. */
    receive(message: unknown): void;
    request<T = unknown>(method: string, params?: object, timeoutMs?: number): Promise<T>;
    notify(method: string, params?: object): void;
    /** Fails every pending request and ignores everything after. */
    close(reason: string): void;
}

export const DEFAULT_TIMEOUT_MS = 10000;

/** A JSON-RPC 2.0 message: an object saying so. Batches (arrays) are not used. */
export function isMessage(value: unknown): value is Message {
    return typeof value === "object" && value !== null && !Array.isArray(value) && (value as Message).jsonrpc === "2.0";
}

const isId = (id: unknown): id is string | number => typeof id === "string" || typeof id === "number";

export function createPeer(send: (message: Message) => void, options: PeerOptions = {}): Peer {
    const pending = new Map<
        string | number,
        { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
    >();
    let nextId = 1;
    let closed = false;

    function respond(id: string | number, outcome: { result: unknown } | { error: RpcError }) {
        if (!closed) {
            if ("result" in outcome) {
                send({ jsonrpc: "2.0", id, result: outcome.result ?? {} });
            } else {
                const { code, message, data } = outcome.error;
                send({ jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } });
            }
        }
    }

    async function answer(id: string | number, method: string, params: unknown) {
        const handler = options.requests?.[method];
        if (handler) {
            try {
                respond(id, { result: await handler(params) });
            } catch (e) {
                const error =
                    e instanceof RpcError ? e : new RpcError(ERRORS.INTERNAL_ERROR, String((e as Error)?.message ?? e));
                respond(id, { error });
            }
        } else {
            respond(id, { error: new RpcError(ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`) });
        }
    }

    function settle(message: Message) {
        const waiting = pending.get(message.id as string | number);
        if (waiting) {
            pending.delete(message.id as string | number);
            clearTimeout(waiting.timer);
            const error = message.error as { code?: unknown; message?: unknown; data?: unknown } | undefined;
            if (error) {
                waiting.reject(new RpcError(Number(error.code), String(error.message ?? "error"), error.data));
            } else {
                waiting.resolve(message.result);
            }
        }
    }

    return {
        receive(message) {
            if (!closed && isMessage(message)) {
                const { id, method } = message;
                if (typeof method === "string" && isId(id)) {
                    void answer(id, method, message.params);
                } else if (typeof method === "string" && id === undefined) {
                    options.notifications?.[method]?.(message.params);
                } else if (isId(id) && ("result" in message || "error" in message)) {
                    settle(message);
                } else if (isId(id)) {
                    respond(id, { error: new RpcError(ERRORS.INVALID_REQUEST, "Invalid request") });
                }
            }
        },
        request<T>(method: string, params?: object, timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS) {
            return new Promise<T>((resolve, reject) => {
                if (closed) {
                    reject(new Error(`${method}: the connection is closed`));
                } else {
                    const id = nextId++;
                    const timer = setTimeout(() => {
                        pending.delete(id);
                        reject(new Error(`${method}: no response within ${timeoutMs} ms`));
                    }, timeoutMs);
                    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
                    send({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) });
                }
            });
        },
        notify(method, params) {
            if (!closed) {
                send({ jsonrpc: "2.0", method, ...(params ? { params } : {}) });
            }
        },
        close(reason) {
            closed = true;
            for (const [id, waiting] of pending) {
                clearTimeout(waiting.timer);
                waiting.reject(new Error(reason));
                pending.delete(id);
            }
        },
    };
}
