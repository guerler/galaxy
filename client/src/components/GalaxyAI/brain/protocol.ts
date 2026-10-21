/**
 * The protocol between GalaxyAI's wrapper (the host, Galaxy's client) and the AI brain it mounts
 * (`ai_chat_plugin`, a same-origin iframe). JSON-RPC 2.0, initialized and negotiated as MCP Apps
 * does, without the rest of MCP Apps. `conformance.json` holds the same contract as wire transcripts
 * that both sides' tests replay; a brain elsewhere keeps a copy of it, not of this code.
 *
 * Galaxy's API stays authoritative for data and state: the brain reads and writes them itself, with
 * the user's session. Messages only coordinate the two UIs: commands the host gives, and events the
 * brain reports.
 *
 * Trust: the brain is a plugin the admin installs, running unsandboxed on Galaxy's origin like any
 * visualization. It has what a Galaxy page has: the user's session for every API call, Galaxy's DOM
 * and state through `window.parent`, and the page's navigation. This protocol coordinates; it is not
 * a security boundary. Its origin checks keep out other origins; its port keeps out stray messages
 * of other frames, which being same-origin could reach Galaxy directly anyway. Moving the brain to
 * an origin of its own would contain a compromised brain (markup injected through model output, a
 * bad dependency) to that origin, but not its API calls while it acts with the user's full session.
 * The handshake depends only on origins and the session is a port, so such a move changes how the
 * brain is served and authenticated, and how the host notices the brain's page go, not these
 * messages.
 *
 * Lifecycle:
 * 1. The host listens before it loads the brain.
 * 2. A brain mounted in a frame is hosted. It requests `initialize` with `postMessage` to its parent;
 *    the host answers into the brain's frame with its version, info and capabilities, and transfers
 *    a `MessagePort` with the answer. Everything else of the session, both ways, goes over that port.
 * 3. The brain notifies `initialized`. The host sends nothing before it.
 * 4. The host sends one initial command (`chat/open` or `chat/ask`), then any others as they come.
 * Each `initialize` starts a new session and ends the one before; each side fails the requests still
 * pending in an ended session. The host also ends the session when the brain's page goes away (and
 * mounts the brain again), when Galaxy's page does, and when it removes the brain.
 *
 * Rules:
 * - The handshake goes between the brain's window and its parent, only from and to Galaxy's origin,
 *   never "*". The host answers `initialize` into its brain's frame, whatever window the message
 *   names as its source: WebKit names the parent itself for some messages of a same-origin frame
 *   (WebKit bug 163412), so the source only rules out other frames. The port is then the session,
 *   held by its two ends alone. No batches.
 * - Every request gets one response. The requester times it out; a late response is dropped.
 * - The host gives a brain as long as it needs to load. A hosted brain that has no answer to
 *   `initialize` in time, or one it cannot take, says so in its frame; it does not run another way.
 * - A command's result says it was accepted, not that its effect is done: effects are reported by
 *   events, which are authoritative.
 * - Additive evolution: params and results are objects, unknown fields and unknown notifications are
 *   ignored, an unknown request is answered with `METHOD_NOT_FOUND`. Methods come in features, which
 *   each side declares in `capabilities`; neither side calls a feature the other did not declare.
 *   `protocolVersion` changes only for a breaking change.
 */

/** The version this host speaks. */
export const PROTOCOL_VERSION = "2026-10-19";

export const METHODS = {
    initialize: "initialize",
    initialized: "initialized",
    chatOpen: "chat/open",
    chatAsk: "chat/ask",
    chatActiveChanged: "chat/activeChanged",
} as const;

/** JSON-RPC 2.0's own error codes, the only ones this version uses. */
export const ERRORS = {
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
} as const;

export interface Info {
    name: string;
    version: string;
}

/**
 * Features each side takes part in, keyed by name; unknown keys are ignored. `chat`: the brain
 * handles `chat/open` and `chat/ask` and sends `chat/activeChanged`; the host sends the commands and
 * accepts the event.
 */
export interface Capabilities {
    chat?: Record<string, never>;
    [feature: string]: unknown;
}

export interface InitializeParams {
    protocolVersion: string;
    clientInfo: Info;
    capabilities: Capabilities;
}

export interface InitializeResult {
    protocolVersion: string;
    hostInfo: Info;
    capabilities: Capabilities;
}

/**
 * Show this saved chat. Without an id, show what the brain shows on its own, such as the
 * conversation it last had: the host has no chat to give, which is not a request for a new one.
 */
export interface ChatOpenParams {
    exchange_id?: string;
}

/** Start a new conversation with this question. Accepted, not answered, when the request returns. */
export interface ChatAskParams {
    question: string;
}

/** The conversation the brain now shows, by its saved chat's id; null while it is not saved. */
export interface ChatActiveChangedParams {
    exchange_id: string | null;
}
