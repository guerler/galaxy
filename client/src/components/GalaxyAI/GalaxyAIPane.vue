<script setup lang="ts">
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { storeToRefs } from "pinia";

import { useConfig } from "@/composables/config";
import { useChatPlugin } from "@/composables/useChatPlugin";
import { useChatStore } from "@/stores/chatStore";

import { paneSlot } from "./pane";

import GAlert from "@/components/BaseComponents/GAlert.vue";
import Heading from "@/components/Common/Heading.vue";
import VisualizationSlot from "@/components/Visualizations/VisualizationSlot.vue";

/** The center view's place for the chat plugin's pane, which shows apart from the chat while it is docked. */
const { isConfigLoaded } = useConfig();
const chatPlugin = useChatPlugin();
const { isPaneApart } = storeToRefs(useChatStore());
</script>

<template>
    <div v-if="!isConfigLoaded" />
    <div v-else-if="chatPlugin && isPaneApart" class="galaxy-ai-pane">
        <div class="galaxy-ai-pane-header">
            <Heading :icon="faMagic" size="lg">
                <span class="heading-label">GalaxyAI</span>
            </Heading>
        </div>
        <div class="galaxy-ai-pane-body">
            <VisualizationSlot :name="paneSlot(chatPlugin)" />
        </div>
    </div>
    <GAlert v-else-if="chatPlugin" variant="info" show>
        What GalaxyAI makes shows here while the chat is docked to the side or the bottom.
    </GAlert>
    <GAlert v-else variant="info" show>This Galaxy has no AI chat.</GAlert>
</template>

<style scoped lang="scss">
@import "@/style/scss/theme/blue.scss";

.galaxy-ai-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.galaxy-ai-pane-header {
    padding: 1rem 1.25rem;
    background: $panel-bg-color;
    border-bottom: $border-default;

    :deep(.heading) {
        margin-bottom: 0;
    }
}

.galaxy-ai-pane-body {
    flex: 1;
    min-height: 0;
}
</style>
