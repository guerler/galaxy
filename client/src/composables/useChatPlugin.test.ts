import { createTestingPinia } from "@pinia/testing";
import { setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";

import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

import { useChatPlugin } from "./useChatPlugin";

function chatPluginWith(config: Record<string, unknown> | null, anonymous = false) {
    setActivePinia(createTestingPinia({ createSpy: vi.fn }));
    const configStore = useConfigStore();
    // @ts-ignore - testing pinia makes getters writable
    configStore.isLoaded = config !== null;
    configStore.config = config ?? {};
    // @ts-ignore - testing pinia makes getters writable
    useUserStore().isAnonymous = anonymous;
    return useChatPlugin().value;
}

describe("useChatPlugin", () => {
    it("names the plugin once Galaxy has an AI backend and a signed-in user", () => {
        expect(chatPluginWith({ llm_api_configured: true, ai_chat_plugin: "olit" })).toBe("olit");
    });

    it("is no chat otherwise", () => {
        expect(chatPluginWith(null)).toBeNull();
        expect(chatPluginWith({ llm_api_configured: true })).toBeNull();
        expect(chatPluginWith({ llm_api_configured: false, ai_chat_plugin: "olit" })).toBeNull();
        expect(chatPluginWith({ llm_api_configured: true, ai_chat_plugin: "olit" }, true)).toBeNull();
    });
});
