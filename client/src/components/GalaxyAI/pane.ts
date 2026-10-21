/** Where GalaxyAI shows the brain's pane apart from its chat (`chat.pane`), while the chat is docked. */
export const PANE_PATH = "/artifacts";

/** The slots of the brain's pane: its plugin's, apart from the chat's. */
export const paneSlot = (plugin: string) => `${plugin}#pane`;
