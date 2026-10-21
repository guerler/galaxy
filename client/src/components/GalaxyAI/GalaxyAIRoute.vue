<script setup lang="ts">
import { storeToRefs } from "pinia";
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useConfig } from "@/composables/config";
import { useChatPlugin } from "@/composables/useChatPlugin";
import { useChatStore } from "@/stores/chatStore";

import PluginChat from "./PluginChat.vue";
import GalaxyAI from "@/components/GalaxyAI.vue";

/** The center view's chat: the chat plugin when Galaxy has one, GalaxyAI's own otherwise. */
const props = defineProps<{ exchangeId?: string; compact?: boolean; initialQuestion?: string }>();

const { isConfigLoaded } = useConfig();
const chatPlugin = useChatPlugin();
const chatStore = useChatStore();
const { activeChatId } = storeToRefs(chatStore);
const route = useRoute();
const router = useRouter();

watch(
    [chatPlugin, () => props.exchangeId, () => props.initialQuestion],
    ([plugin, exchangeId, question]) => {
        if (plugin && question) {
            chatStore.askChat(question);
            // Asked once: a reload of the page does not ask again.
            router.replace({ path: route.path, query: {} });
        } else if (plugin && exchangeId && exchangeId !== "new") {
            chatStore.openChat(exchangeId);
        }
    },
    { immediate: true },
);

// The address follows the conversation the brain reports, so a reload reopens it. GalaxyAI's own
// chat keeps its address itself.
watch(activeChatId, (id) => {
    const path = id ? `/galaxyai/${id}` : "/galaxyai";
    if (chatPlugin.value && route.path !== path && !props.initialQuestion) {
        router.replace(path);
    }
});
</script>

<template>
    <div v-if="!isConfigLoaded" />
    <PluginChat v-else-if="chatPlugin" :plugin="chatPlugin" source="center" />
    <GalaxyAI
        v-else
        :exchange-id="props.exchangeId"
        :compact="props.compact"
        :initial-question="props.initialQuestion" />
</template>
