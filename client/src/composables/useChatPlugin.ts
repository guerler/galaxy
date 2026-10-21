import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

/**
 * The visualization plugin Galaxy mounts as its AI chat (`ai_chat_plugin`), or null where there is no
 * chat. Behind the AI gate, and only for a signed-in user, whose session the plugin works in.
 */
export function useChatPlugin() {
    // Read from the store, not useConfig(), which would load it again wherever this is used.
    const { config, isLoaded: isConfigLoaded } = storeToRefs(useConfigStore());
    const { isAnonymous } = storeToRefs(useUserStore());
    return computed<string | null>(() => {
        const plugin = config.value?.ai_chat_plugin;
        const available = isConfigLoaded.value && config.value?.llm_api_configured && !isAnonymous.value && plugin;
        return available ? String(plugin) : null;
    });
}
