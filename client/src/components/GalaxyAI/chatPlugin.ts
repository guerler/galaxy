/**
 * The contract between Galaxy AI and the browser plugin it hosts as its chat (`ai_chat_plugin`).
 *
 * Galaxy mounts the plugin once, for a signed-in user, like any visualization plugin, with a `ChatConfig`.
 * The plugin reports with Galaxy Charts messages (`from: "galaxy-visualization"`) posted to its own window,
 * where Galaxy listens on the frame it mounted: `visualization_config.exchange_id` names the chat Galaxy's
 * address and chat list follow, null while it is unsaved, and `visualization_saved: false` makes Galaxy ask
 * before the page is left or the conversation replaced. Its first message says it takes commands, so it
 * listens before it sends one. Galaxy then posts each `ChatCommand` into the plugin's window at Galaxy's
 * origin, marked `from: "galaxy"`, in the order given. Each command is delivered at most once: if the
 * plugin's page reloads, Galaxy mounts it again on the chat it last reported, without the commands it
 * already gave. Each side ignores messages it does not know.
 */

export const CHAT_VIEW = "chat";

/** The config Galaxy mounts the plugin with */
export interface ChatConfig {
    view: typeof CHAT_VIEW;
    /** The saved chat to show */
    exchange_id?: string;
    /** A question to ask in a new conversation */
    question?: string;
}

/** A command Galaxy sends to the running plugin */
export type ChatCommand = { type: "open"; exchange_id: string } | { type: "ask"; question: string };

/** Returns the message that carries `command` */
export function commandMessage(command: ChatCommand) {
    return { from: "galaxy", ...command };
}

/** Returns the chat a reported config names, null for an unsaved one, or undefined if it names none */
export function activeChat(config: unknown): string | null | undefined {
    const id = (config as Record<string, unknown> | null)?.exchange_id;
    return id === null || (typeof id === "string" && id) ? id : undefined;
}
