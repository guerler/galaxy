<script setup>
import { getGalaxyInstance } from "app";
import CenterFrame from "./CenterFrame";
import HistoryIndex from "components/History/Index";
import MastheadItem from "components/Masthead/MastheadItem";
import ToolBox from "components/Panels/ProviderAwareToolBox";
import SidePanel from "components/Panels/SidePanel";
import { UploadButton } from "components/Upload";
import { useRoute, useRouter } from "vue-router/composables";
import { computed, ref, onMounted, onUnmounted } from "vue";

const route = useRoute();
const router = useRouter();
const showCenter = ref(false);
const searchTab = ref({ id: "tool-search", icon: "fa-search" });
const searchToggle = ref(false);

// computed
const showPanels = computed(() => {
    const panels = route.query.hide_panels;
    if (panels !== undefined) {
        return panels.toLowerCase() != "true";
    }
    return true;
});
const toolBoxProperties = computed(() => {
    const Galaxy = getGalaxyInstance();
    return {
        storedWorkflowMenuEntries: Galaxy.config.stored_workflow_menu_entries,
    };
});

// methods
function hideCenter() {
    showCenter.value = false;
}
function onLoad() {
    showCenter.value = true;
}
function onSearchToggle() {
    searchToggle.value = !searchToggle.value;
}

// life cycle
onMounted(() => {
    // Using a custom event here which, in contrast to watching $route,
    // always fires when a route is pushed instead of validating it first.
    router.app.$on("router-push", hideCenter);
});
onUnmounted(() => {
    router.app.$off("router-push", hideCenter);
});
</script>
<template>
    <div id="columns" class="d-flex">
        <b-nav vertical class="side-bar pt-1">
            <b-nav-item v-b-tooltip.hover.right class="my-1" title="Search Tools and Workflows" @click="onSearchToggle">
                <template>
                    <span class="fa fa-search" />
                </template>
            </b-nav-item>
            <upload-button />
        </b-nav>
        <div v-show="searchToggle">
            <ToolBox v-bind="toolBoxProperties" class="side-column" />
        </div>
        <div class="center-column overflow-auto p-3 w-100">
            <CenterFrame v-show="showCenter" id="galaxy_main" @load="onLoad" />
            <router-view v-show="!showCenter" class="h-100" :key="$route.fullPath" />
        </div>
        <HistoryIndex class="side-column" />
    </div>
</template>
<style scoped>
@import "theme/blue.scss";
.nav-item {
    cursor: pointer;
    text-decoration: none;
    list-style-type: none;
}
.side-bar {
    width: 2.8rem;
    min-width: 2.8rem;
    max-width: 2.8rem;
    background: $panel-bg-color;
}
.side-column {
    min-width: 18rem;
    max-width: 18rem;
    width: 18rem;
}
</style>
