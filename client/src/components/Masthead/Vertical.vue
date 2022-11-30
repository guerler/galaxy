<script setup>
import { UploadButton } from "components/Upload";
import { BNavbar, BNavbarBrand, BNavbarNav } from "bootstrap-vue";
import MastheadItem from "./MastheadItem";
import ToolBox from "components/Panels/ProviderAwareToolBox";
import { getGalaxyInstance } from "app";
import { computed, ref } from "vue";

/* props */
const props = defineProps({
});

/* refs */
const searchTab = ref({ id: "tool-search", icon: "fa-search", text: "search" });
const searchToggle = ref(false);

/* computed */
const toolBoxProperties = computed(() => {
    const Galaxy = getGalaxyInstance();
    return {
        storedWorkflowMenuEntries: Galaxy.config.stored_workflow_menu_entries,
    };
});
</script>
<template>
    <b-nav vertical class="masthead-vertical">
        <masthead-item :tab="searchTab" :toggle="searchToggle" />
        <tool-box v-bind="toolBoxProperties" />
        <upload-button />
    </b-nav>
</template>
