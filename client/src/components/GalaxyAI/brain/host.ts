/**
 * The host's side of the brain protocol (`protocol.ts`) for one brain frame: answers `initialize`
 * with a port for the session, waits for `initialized`, then gives commands and takes events over
 * it, one session per `initialize`. Knows nothing of the brain behind the frame, or of how Galaxy
 * shows it.
 */
import { createPeer, isMessage, type Message, type Peer, RpcError } from "./jsonrpc";
import {
    type Capabilities,
    type ChatActiveChangedParams,
    type ChatAskParams,
    type ChatOpenParams,
    type ChatUnsavedChangedParams,
    ERRORS,
    type Info,
    type InitializeParams,
    type InitializeResult,
    METHODS,
    PROTOCOL_VERSION,
} from "./protocol";

/** An initialized brain: who it is, what it takes part in, and the commands it can be given. */
export interface BrainSession {
    info: Info;
    capabilities: Capabilities;
    open(params: ChatOpenParams): Promise<void>;
    ask(params: ChatAskParams): Promise<void>;
}

export interface HostOptions {
    hostInfo: Info;
    /** A brain has initialized: the host gives it its initial command now. */
    onReady(session: BrainSession): void;
    /** The session ended: the brain loaded again, its page went away, or the host closed. */
    onClosed?(): void;
    /** The brain's page went away and no brain is left in the frame: mount it again to have one. */
    onUnloaded?(): void;
    onActiveChanged(params: ChatActiveChangedParams): void;
    /** From a brain that declared `chat.unsaved`. */
    onUnsavedChanged?(params: ChatUnsavedChangedParams): void;
    /** A brain that declared `chat.pane` asks for its pane apart to be shown. */
    onShowPane?(): void;
    timeoutMs?: number;
}

export interface BrainHost {
    close(): void;
}

interface Session {
    peer: Peer;
    port: MessagePort;
    brain: InitializeParams;
    ready: boolean;
    /** Stops watching the page that initialized it. */
    unwatch(): void;
}

function initializeParams(params: unknown): InitializeParams {
    const given = (params ?? {}) as Partial<InitializeParams>;
    let problem: string | undefined;
    if (typeof given.protocolVersion !== "string") {
        problem = "protocolVersion must be a string";
    } else if (typeof given.clientInfo?.name !== "string" || typeof given.clientInfo?.version !== "string") {
        problem = "clientInfo must name the brain and its version";
    } else if (typeof given.capabilities !== "object" || given.capabilities === null) {
        problem = "capabilities must be an object";
    }
    if (problem) {
        throw new RpcError(ERRORS.INVALID_PARAMS, problem);
    }
    return given as InitializeParams;
}

/**
 * Hosts the brain in the frame `frame()` returns, from now on: the listener is in place before the
 * brain loads, and answers into the frame as it is when `initialize` arrives.
 */
export function hostBrain(frame: () => Window | null | undefined, options: HostOptions): BrainHost {
    // The document's origin, which a frame without a src inherits; DOMs for tests lack it.
    const origin = window.origin ?? window.location.origin;
    let session: Session | undefined;

    function end(reason: string) {
        if (session) {
            session.unwatch();
            session.peer.close(reason);
            session.port.close();
            session = undefined;
            options.onClosed?.();
        }
    }

    function start(brain: Window, request: Message) {
        let params: InitializeParams | undefined;
        try {
            params = initializeParams(request.params);
        } catch (e) {
            const { code, message } = e as RpcError;
            brain.postMessage({ jsonrpc: "2.0", id: request.id, error: { code, message } }, origin);
        }
        if (params) {
            end("The brain loaded again.");
            const { port1: port, port2 } = new MessageChannel();
            // A page that goes into the back-forward cache with Galaxy's comes back with it.
            const gone = (event: PageTransitionEvent) => {
                if (!event.persisted && session === current) {
                    end("The brain's page went away.");
                    options.onUnloaded?.();
                }
            };
            brain.addEventListener("pagehide", gone);
            const current: Session = {
                brain: params,
                port,
                ready: false,
                unwatch: () => brain.removeEventListener("pagehide", gone),
                peer: createPeer((message) => port.postMessage(message), {
                    timeoutMs: options.timeoutMs,
                    notifications: {
                        [METHODS.initialized]: () => {
                            if (!current.ready) {
                                current.ready = true;
                                if (current.brain.capabilities.chat) {
                                    options.onReady({
                                        info: current.brain.clientInfo,
                                        capabilities: current.brain.capabilities,
                                        open: (params) => current.peer.request(METHODS.chatOpen, params).then(() => {}),
                                        ask: (params) => current.peer.request(METHODS.chatAsk, params).then(() => {}),
                                    });
                                }
                            }
                        },
                        [METHODS.chatActiveChanged]: (params) => {
                            const id = (params as Partial<ChatActiveChangedParams> | undefined)?.exchange_id;
                            if (current.ready && (typeof id === "string" || id === null)) {
                                options.onActiveChanged({ exchange_id: id });
                            }
                        },
                        [METHODS.chatUnsavedChanged]: (params) => {
                            const unsaved = (params as Partial<ChatUnsavedChangedParams> | undefined)?.unsaved;
                            const declared = !!current.brain.capabilities.chat?.unsaved;
                            if (current.ready && declared && typeof unsaved === "boolean") {
                                options.onUnsavedChanged?.({ unsaved });
                            }
                        },
                        [METHODS.chatShowPane]: () => {
                            if (current.ready && current.brain.capabilities.chat?.pane) {
                                options.onShowPane?.();
                            }
                        },
                    },
                }),
            };
            port.onmessage = (event) => current.peer.receive(event.data);
            session = current;
            const result: InitializeResult = {
                protocolVersion: PROTOCOL_VERSION,
                hostInfo: options.hostInfo,
                capabilities: { chat: { unsaved: {}, pane: {} } },
            };
            brain.postMessage({ jsonrpc: "2.0", id: request.id, result }, origin, [port2]);
        }
    }

    function onMessage(event: MessageEvent) {
        const brain = frame();
        // WebKit names this window as the source of some messages of a same-origin frame.
        const fromBrain = event.source === brain || event.source === window;
        const data = event.data;
        if (brain && fromBrain && event.origin === origin && isMessage(data)) {
            if (data.method === METHODS.initialize && (typeof data.id === "string" || typeof data.id === "number")) {
                start(brain, data);
            }
        }
    }

    // Galaxy's page goes away before its frames do, so the brain's going after it is no reload.
    function onLeave(event: PageTransitionEvent) {
        if (!event.persisted) {
            end("Galaxy's page went away.");
        }
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onLeave);
    return {
        close() {
            window.removeEventListener("message", onMessage);
            window.removeEventListener("pagehide", onLeave);
            end("The host closed the brain.");
        },
    };
}
