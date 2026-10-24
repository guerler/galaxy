<script setup lang="ts">
import { storeToRefs } from "pinia";
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useConfig } from "@/composables/config";
import { useChatPlugin } from "@/composables/useChatPlugin";
import { useChatStore } from "@/stores/chatStore";

import PluginChat from "./PluginChat.vue";
import GAlert from "@/components/BaseComponents/GAlert.vue";

/** The center view's chat: the chat plugin, opening a saved chat or a question when given one. */
const props = defineProps<{ exchangeId?: string; initialQuestion?: string }>();

const { isConfigLoaded } = useConfig();
const chatPlugin = useChatPlugin();
const chatStore = useChatStore();
const { activeChatId } = storeToRefs(chatStore);
const route = useRoute();
const router = useRouter();

/** Where the address points for the conversation the plugin shows. */
const activePath = () => (activeChatId.value ? `/galaxyai/${activeChatId.value}` : "/galaxyai");

watch(
    [chatPlugin, () => props.exchangeId, () => props.initialQuestion],
    ([plugin, exchangeId, question]) => {
        if (plugin && question) {
            // Asked once: a reload of the page does not ask again. Declined, the address goes back.
            const asked = chatStore.askChat(question);
            router.replace(asked ? { path: route.path, query: {} } : activePath());
        } else if (plugin && exchangeId && exchangeId !== "new" && !chatStore.openChat(exchangeId)) {
            router.replace(activePath());
        }
    },
    { immediate: true },
);

// The address follows the conversation the plugin reports, so a reload reopens it.
watch(activeChatId, () => {
    const path = activePath();
    if (route.path !== path && !props.initialQuestion) {
        router.replace(path);
    }
});
</script>

<template>
    <div v-if="!isConfigLoaded" />
    <PluginChat v-else-if="chatPlugin" :plugin="chatPlugin" source="center" />
    <GAlert v-else variant="info" show>This Galaxy has no AI chat.</GAlert>
</template>
