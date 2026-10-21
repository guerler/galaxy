import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useActiveContext } from "@/composables/useActiveContext";
import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

/**
 * The visualization plugin Galaxy mounts as its AI chat (`ai_chat_plugin`), or null for GalaxyAI's
 * own chat. Behind the same gate as the chat itself, and only for a signed-in user, whose session
 * the plugin works in.
 */
export function useChatPlugin() {
    // Read from the store, not useConfig(), which would load it again wherever this is used.
    const { config, isLoaded: isConfigLoaded } = storeToRefs(useConfigStore());
    const { isAnonymous } = storeToRefs(useUserStore());
    return computed<string | null>(() => {
        const plugin = config.value?.ai_chat_plugin;
        if (!isConfigLoaded.value || !config.value?.llm_api_configured || isAnonymous.value || !plugin) {
            return null;
        }
        return String(plugin);
    });
}

/**
 * The chat plugin where the user is now, or null where GalaxyAI's own chat answers: in a notebook,
 * GalaxyAI's Page assistant edits the Page. The plugin itself stays mounted and running meanwhile.
 */
export function useActiveChatPlugin() {
    const chatPlugin = useChatPlugin();
    const { activeContext } = useActiveContext();
    return computed<string | null>(() => (activeContext.value?.contextType === "notebook" ? null : chatPlugin.value));
}
