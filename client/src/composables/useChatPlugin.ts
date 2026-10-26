import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

/** Returns the plugin Galaxy hosts as its AI chat, or null when Galaxy uses its own chat */
export function chatPluginOf(config?: { ai_chat_plugin?: string | null }): string | null {
    return config?.ai_chat_plugin ? String(config.ai_chat_plugin) : null;
}

/** Returns whether Galaxy offers an AI chat */
export function hasAiChat(config?: { ai_chat_plugin?: string | null; llm_api_configured?: boolean }): boolean {
    return Boolean(chatPluginOf(config) || config?.llm_api_configured);
}

/**
 * Returns the plugin Galaxy AI hosts as its chat, null for Galaxy's own chat, or undefined until that
 * is known. A configured plugin is for signed-in users only, so it waits for the user to load.
 */
export function useChatPlugin() {
    // Read from the store, not useConfig(), which would load it again wherever this is used.
    const { config, isLoaded } = storeToRefs(useConfigStore());
    const { currentUser, isAnonymous } = storeToRefs(useUserStore());
    return computed(() => {
        let plugin: string | null | undefined;
        if (isLoaded.value) {
            const configured = chatPluginOf(config.value);
            if (!configured) {
                plugin = null;
            } else if (currentUser.value) {
                plugin = isAnonymous.value ? null : configured;
            }
        }
        return plugin;
    });
}
