import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";

import { useConfigStore } from "@/stores/configurationStore";
import { useUserStore } from "@/stores/userStore";

import { chatPluginOf, hasAiChat, useChatPlugin } from "./useChatPlugin";

vi.mock("@/api/client", () => ({ GalaxyApi: () => ({ GET: vi.fn(() => new Promise(() => {})) }) }));

function chatPluginWith(config: Record<string, unknown> | null, user: object | null) {
    setActivePinia(createPinia());
    if (config) {
        useConfigStore().setConfiguration(config);
    }
    useUserStore().currentUser = user as never;
    return useChatPlugin().value;
}

const SIGNED_IN = { id: "u1", email: "u1@example.org" };
const ANONYMOUS = { total_disk_usage: 0 };

describe("useChatPlugin", () => {
    it("names the configured plugin for a signed-in user, with or without Galaxy's own AI", () => {
        expect(chatPluginWith({ ai_chat_plugin: "fixture" }, SIGNED_IN)).toBe("fixture");
        expect(chatPluginWith({ ai_chat_plugin: "fixture", llm_api_configured: true }, SIGNED_IN)).toBe("fixture");
    });

    it("chooses Galaxy's own chat without a plugin, or for an anonymous user", () => {
        expect(chatPluginWith({ llm_api_configured: true }, SIGNED_IN)).toBeNull();
        expect(chatPluginWith({ ai_chat_plugin: "fixture" }, ANONYMOUS)).toBeNull();
    });

    it("waits for the configuration, and for the user only when a plugin is configured", () => {
        expect(chatPluginWith(null, SIGNED_IN)).toBeUndefined();
        expect(chatPluginWith({ ai_chat_plugin: "fixture" }, null)).toBeUndefined();
        expect(chatPluginWith({ llm_api_configured: true }, null)).toBeNull();
    });

    it("offers the chat with a plugin or with Galaxy's own AI", () => {
        expect(chatPluginOf({ ai_chat_plugin: "fixture" })).toBe("fixture");
        expect(chatPluginOf({ ai_chat_plugin: null })).toBeNull();
        expect(chatPluginOf(undefined)).toBeNull();
        expect(hasAiChat({ ai_chat_plugin: "fixture" })).toBe(true);
        expect(hasAiChat({ llm_api_configured: true })).toBe(true);
        expect(hasAiChat({ llm_api_configured: false, ai_chat_plugin: null })).toBe(false);
        expect(hasAiChat(undefined)).toBe(false);
    });
});
