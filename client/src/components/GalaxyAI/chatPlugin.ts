/**
 * How GalaxyAI runs its chat plugin (`ai_chat_plugin`): as a visualization, over the channel every
 * visualization has with `VisualizationFrame`, in one frame that GalaxyAI places and the plugin fills.
 *
 * - In: the plugin is mounted with a `ChatConfig`. Opening a saved chat or asking a question mounts
 *   it anew with the config that says so; nothing is sent to a plugin already mounted.
 * - Out, as any visualization: `visualization_config` is the `ChatConfig` of the chat it shows, by
 *   its `exchange_id` once saved. GalaxyAI keeps it to mount the plugin with next, so a reload of the
 *   plugin reopens that chat; a config the plugin sends never mounts it anew. `visualization_saved`
 *   says whether the chat shown is saved, for the warnings before a command replaces it or the page
 *   unloads; the last word holds until the plugin mounted next says.
 * - A saved chat it cannot open, such as one another plugin saved, it says so about and starts anew.
 */

export const CHAT_VIEW = "chat";

export interface ChatConfig {
    view: typeof CHAT_VIEW;
    /** The saved chat to show. Without one, and without a question, the plugin shows what it would. */
    exchange_id?: string;
    /** A question to ask in a new conversation. */
    question?: string;
}

/** The saved chat a config the plugin sent names; null for none or for anything that is not one. */
export function shownChat(config: unknown): string | null {
    const id = (config as Partial<ChatConfig> | null | undefined)?.exchange_id;
    return typeof id === "string" && id ? id : null;
}
