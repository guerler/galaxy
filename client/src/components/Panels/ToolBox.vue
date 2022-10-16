<template>
    <b-popover target="tool-search" custom-class="shadow-lg rounded overflow-auto w-25 h-75" placement="bottom" triggers="hover">
        <tool-search
            class="mb-2"
            :current-panel-view="currentPanelView"
            :placeholder="titleSearchTools"
            :show-advanced.sync="showAdvanced"
            :toolbox="toolbox"
            :query="query"
            @onQuery="onQuery"
            @onResults="onResults" />
        <b-button-group class="w-100 mb-2">
            <b-button class="px-1 py-0" size="sm" variant="outline">
                <span class="far fa-search-plus mr-1" />
                <span>Advanced</span>
            </b-button>
            <b-button class="px-1 py-0" size="sm" variant="outline">
                <span class="far fa-map mr-1" />
                <span>Layout</span>
            </b-button>
            <b-button class="px-1 py-0" size="sm" variant="outline">
                <span class="fa fa-star-o mr-1" />
                <span>Favorites</span>
            </b-button>
        </b-button-group>
        <div class="unified-panel-body" v-if="!showAdvanced">
            <div v-if="!query || hasResults" class="pb-2">
                <div class="toolMenuContainer">
                    <div class="toolMenu">
                        <tool-section
                            v-for="(section, key) in sections"
                            :key="key"
                            :category="section"
                            :query-filter="queryFilter"
                            @onClick="onOpen" />
                    </div>
                    <tool-section :category="{ text: workflowTitle }" />
                    <div id="internal-workflows" class="toolSectionBody">
                        <div class="toolSectionBg" />
                        <div v-for="wf in workflows" :key="wf.id" class="toolTitle">
                            <a class="title-link" :href="wf.href">{{ wf.title }}</a>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="queryTooShort" class="pb-2">
                <b-badge class="alert-danger w-100">Search string too short!</b-badge>
            </div>
            <div v-else-if="queryFinished" class="pb-2">
                <b-badge class="alert-danger w-100">No results found!</b-badge>
            </div>
        </div>
    </b-popover>
</template>

<script>
import ToolSection from "./Common/ToolSection";
import ToolSearch from "./Common/ToolSearch";
import { openGlobalUploadModal } from "components/Upload";
import FavoritesButton from "./Buttons/FavoritesButton";
import PanelViewButton from "./Buttons/PanelViewButton";
import { filterToolSections, filterTools, hasResults } from "./utilities";
import { getGalaxyInstance } from "app";
import { getAppRoot } from "onload";
import _l from "utils/localization";

export default {
    components: {
        FavoritesButton,
        PanelViewButton,
        ToolSection,
        ToolSearch,
    },
    props: {
        toolbox: {
            type: Array,
            required: true,
        },
        panelViews: {
            type: Object,
        },
        currentPanelView: {
            type: String,
        },
        storedWorkflowMenuEntries: {
            type: Array,
            required: true,
        },
        workflowTitle: {
            type: String,
            default: _l("Workflows"),
        },
    },
    data() {
        return {
            expanded: false,
            query: null,
            results: null,
            queryFilter: null,
            queryPending: false,
            showAdvanced: false,
            buttonText: "",
            buttonIcon: "",
            titleSearchTools: _l("search tools"),
        };
    },
    computed: {
        queryTooShort() {
            return this.query && this.query.length < 3;
        },
        queryFinished() {
            return this.query && this.queryPending != true;
        },
        sections() {
            return hasResults(this.results) ? filterTools(this.toolbox, this.results) : this.toolbox;
        },
        isUser() {
            const Galaxy = getGalaxyInstance();
            return !!(Galaxy.user && Galaxy.user.id);
        },
        workflows() {
            return [
                {
                    title: _l("All workflows"),
                    href: `${getAppRoot()}workflows/list`,
                    id: "list",
                },
                ...this.storedWorkflowMenuEntries.map((menuEntry) => {
                    return {
                        id: menuEntry.id,
                        title: menuEntry.name,
                        href: `${getAppRoot()}workflows/run?id=${menuEntry.id}`,
                    };
                }),
            ];
        },
        hasResults() {
            return this.results && this.results.length > 0;
        },
    },
    methods: {
        onQuery(q) {
            this.query = q;
            this.queryPending = true;
        },
        onResults(results) {
            this.results = results;
            this.queryFilter = this.hasResults ? this.query : null;
            this.queryPending = false;
        },
        onOpen(tool, evt) {
            if (tool.id === "upload1") {
                evt.preventDefault();
                openGlobalUploadModal();
            } else if (tool.form_style === "regular") {
                evt.preventDefault();
                // encode spaces in tool.id
                const toolId = tool.id;
                const toolVersion = tool.version;
                this.$router.push(`/?tool_id=${encodeURIComponent(toolId)}&version=${toolVersion}`);
            }
        },
        updatePanelView(panelView) {
            this.$emit("updatePanelView", panelView);
        },
    },
};
</script>
