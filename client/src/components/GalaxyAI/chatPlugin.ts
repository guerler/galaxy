/**
 * The contract between Galaxy AI and the agent application it hosts as its chat (`ai_chat_plugin`).
 *
 * Galaxy mounts the agent once with a `ChatConfig`. The agent sends `ready` to the page that hosts it
 * once it takes commands, and Galaxy answers with `connect`, which carries a `MessagePort`. After that,
 * Galaxy sends `ChatCommand` messages over the port, in the order they were given, and the agent sends
 * `AgentReport` messages back. Every message carries `channel: CHAT_CHANNEL`.
 */

export const CHAT_VIEW = "chat";
export const CHAT_CHANNEL = "galaxy-ai";

/** The config Galaxy mounts the agent with */
export interface ChatConfig {
    view: typeof CHAT_VIEW;
    /** The saved chat to show */
    exchange_id?: string;
    /** A question to ask in a new conversation */
    question?: string;
}

/** A command Galaxy sends to the running agent */
export type ChatCommand = { type: "open"; exchange_id: string } | { type: "ask"; question: string };

/** A report the agent sends to Galaxy */
export type AgentReport =
    | { type: "ready" }
    | { type: "active"; exchange_id: string | null }
    | { type: "unsaved"; value: boolean };

/** Returns the message that carries `command` */
export function commandMessage(command: ChatCommand) {
    return { channel: CHAT_CHANNEL, ...command };
}

/** Returns the message that hands the agent its port */
export function connectMessage() {
    return { channel: CHAT_CHANNEL, type: "connect" };
}

/** Returns the report a message carries, or null if it carries none */
export function agentReport(data: unknown): AgentReport | null {
    const message = data as Record<string, unknown> | null;
    let report: AgentReport | null = null;
    if (message?.channel === CHAT_CHANNEL) {
        const id = message.exchange_id;
        if (message.type === "ready") {
            report = { type: "ready" };
        } else if (message.type === "active" && (id === null || (typeof id === "string" && id))) {
            report = { type: "active", exchange_id: id };
        } else if (message.type === "unsaved" && typeof message.value === "boolean") {
            report = { type: "unsaved", value: message.value };
        }
    }
    return report;
}
