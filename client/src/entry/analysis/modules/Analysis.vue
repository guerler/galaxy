<template>
    <div id="columns" class="d-flex justify-content-between">
        <VerticalMasthead />
        <div id="center">
            <div class="center-container">
                <CenterFrame v-show="showCenter" id="galaxy_main" @load="onLoad" />
                <div v-show="!showCenter" class="center-panel" style="display: block">
                    <router-view :key="$route.fullPath" class="h-100" />
                </div>
            </div>
        </div>
        <SidePanel v-if="showPanels" side="right" :current-panel="getHistoryIndex()" :current-panel-properties="{}" />
    </div>
</template>
<script>
import HistoryIndex from "components/History/Index";
import SidePanel from "components/Panels/SidePanel";
import CenterFrame from "./CenterFrame";
import VerticalMasthead from "components/Masthead/Vertical";

export default {
    components: {
        CenterFrame,
        SidePanel,
        VerticalMasthead,
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
        getHistoryIndex() {
            return HistoryIndex;
        },
        hideCenter() {
            this.showCenter = false;
        },
        onLoad() {
            this.showCenter = true;
        },
    },
};
</script>
