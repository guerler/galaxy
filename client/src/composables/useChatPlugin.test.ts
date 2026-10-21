import { createTestingPinia } from "@pinia/testing";
import { setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

import { useActiveChatPlugin, useChatPlugin } from "./useChatPlugin";

const mockContext = ref<{ contextType: string } | null>(null);
vi.mock("@/composables/useActiveContext", () => ({ useActiveContext: () => ({ activeContext: mockContext }) }));

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

    it("is GalaxyAI's own chat otherwise", () => {
        expect(chatPluginWith(null)).toBeNull();
        expect(chatPluginWith({ llm_api_configured: true })).toBeNull();
        expect(chatPluginWith({ llm_api_configured: false, ai_chat_plugin: "olit" })).toBeNull();
        expect(chatPluginWith({ llm_api_configured: true, ai_chat_plugin: "olit" }, true)).toBeNull();
    });
});

describe("useActiveChatPlugin", () => {
    it("is the chat plugin, except in a notebook, where GalaxyAI's Page assistant answers", () => {
        chatPluginWith({ llm_api_configured: true, ai_chat_plugin: "olit" });
        mockContext.value = { contextType: "dataset" };
        expect(useActiveChatPlugin().value).toBe("olit");
        mockContext.value = { contextType: "notebook" };
        expect(useActiveChatPlugin().value).toBeNull();
    });
});
