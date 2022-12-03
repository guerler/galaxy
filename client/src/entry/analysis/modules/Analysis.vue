<template>
    <div id="columns" class="d-flex">
        <ToolBox v-bind="toolBoxProperties" style="flex: 1" />
        <div class="overflow-auto" style="flex-basis: 50%">
            <CenterFrame v-show="showCenter" id="galaxy_main" @load="onLoad" />
            <div v-show="!showCenter" class="center-panel" style="display: block">
                <router-view :key="$route.fullPath" class="h-100" />
            </div>
        </div>
        <HistoryIndex style="flex: 1" />
    </div>
</template>
<script>
import { getGalaxyInstance } from "app";
import HistoryIndex from "components/History/Index";
import ToolBox from "components/Panels/ProviderAwareToolBox";
import SidePanel from "components/Panels/SidePanel";
import CenterFrame from "./CenterFrame";

export default {
    components: {
        CenterFrame,
        SidePanel,
        ToolBox,
        HistoryIndex,
    },
    data() {
        return {
            showCenter: false,
        };
    },
    computed: {
        showPanels() {
            const panels = this.$route.query.hide_panels;
            if (panels !== undefined) {
                return panels.toLowerCase() != "true";
            }
            return true;
        },
        toolBoxProperties() {
            const Galaxy = getGalaxyInstance();
            return {
                storedWorkflowMenuEntries: Galaxy.config.stored_workflow_menu_entries,
            };
        },
    },
    mounted() {
        // Using a custom event here which, in contrast to watching $route,
        // always fires when a route is pushed instead of validating it first.
        this.$router.app.$on("router-push", this.hideCenter);
    },
    beforeDestroy() {
        this.$router.app.$off("router-push", this.hideCenter);
    },
    methods: {
        hideCenter() {
            this.showCenter = false;
        },
        onLoad() {
            this.showCenter = true;
        },
    },
};
</script>
