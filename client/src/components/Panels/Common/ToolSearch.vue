<template>
    <div>
        <small v-if="showAdvanced">Filter by name:</small>
        <DelayedInput
            :class="!showAdvanced && 'mb-3'"
            :query="query"
            :delay="100"
            :loading="queryPending"
            :show-advanced="showAdvanced"
            :enable-advanced="enableAdvanced"
            :placeholder="showAdvanced ? 'any name' : placeholder"
            @change="checkQuery"
            @onToggle="onToggle" />
        <div
            v-if="showAdvanced"
            description="advanced tool filters"
            @keyup.enter="onSearch"
            @keyup.esc="onToggle(false)">
            <small class="mt-1">Filter by {{ sectionLabel }}:</small>
            <b-form-input
                v-model="filterSettings['section']"
                autocomplete="off"
                size="sm"
                :placeholder="`any ${sectionLabel}`"
                list="sectionSelect" />
            <b-form-datalist id="sectionSelect" :options="sectionNames"></b-form-datalist>
            <small class="mt-1">Filter by id:</small>
            <b-form-input v-model="filterSettings['id']" size="sm" placeholder="any id" />
            <small class="mt-1">Filter by help text:</small>
            <b-form-input v-model="filterSettings['help']" size="sm" placeholder="any help text" />
            <div class="mt-3">
                <b-button class="mr-1" size="sm" variant="primary" @click="onSearch">
                    <icon icon="search" />
                    <span>{{ "Search" | localize }}</span>
                </b-button>
                <b-button size="sm" @click="onToggle(false)">
                    <icon icon="redo" />
                    <span>{{ "Cancel" | localize }}</span>
                </b-button>
            </div>
        </div>
    </div>
</template>

<script>
import { getGalaxyInstance } from "app";
import DelayedInput from "components/Common/DelayedInput";
import { normalizeTools } from "components/Panels/utilities.js";
import SearchWorker from "worker-loader!../toolSearch.worker.js";

export default {
    name: "ToolSearch",
    components: {
        DelayedInput,
    },
    props: {
        currentPanelView: {
            type: String,
            required: true,
        },
        enableAdvanced: {
            type: Boolean,
            default: false,
        },
        placeholder: {
            type: String,
            default: "search tools",
        },
        query: {
            type: String,
            default: null,
        },
        queryPending: {
            type: Boolean,
            default: false,
        },
        showAdvanced: {
            type: Boolean,
            default: false,
        },
        toolbox: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            favorites: ["#favs", "#favorites", "#favourites"],
            minQueryLength: 3,
            filterSettings: {},
            searchWorker: null,
        };
    },
    computed: {
        favoritesResults() {
            const Galaxy = getGalaxyInstance();
            return Galaxy.user.getFavorites().tools;
        },
        sectionNames() {
            return this.toolbox.map((section) =>
                section.name !== undefined && section.name !== "Uncategorized" ? section.name : ""
            );
        },
        sectionLabel() {
            return this.currentPanelView === "default" ? "section" : "ontology";
        },
        toolsList() {
            return normalizeTools(this.toolbox);
        },
    },
    mounted() {
        this.searchWorker = new SearchWorker();
        this.searchWorker.onmessage = ({ data }) => {
            const { type, payload, query, closestTerm } = data;
            if (type === "searchToolsByKeysResult" && query === this.query) {
                this.$emit("onResults", payload, closestTerm);
            } else if (type === "clearFilterResult") {
                this.$emit("onResults", null);
            } else if (type === "favoriteToolsResult") {
                this.$emit("onResults", this.favoritesResults);
            }
        };
    },
    beforeDestroy() {
        this.searchWorker.terminate();
    },
    methods: {
        checkQuery(q) {
            this.filterSettings["name"] = q;
            this.$emit("onQuery", q);
            if (q && q.length >= this.minQueryLength) {
                if (this.favorites.includes(q)) {
                    this.searchWorker.postMessage({ type: "favoriteTools" });
                } else {
                    // keys with sorting order
                    const keys = { exact: 3, name: 2, description: 1, combined: 0 };
                    const workerMessage = {
                        type: "searchToolsByKeys",
                        payload: {
                            tools: this.toolsList,
                            keys: keys,
                            query: q,
                        },
                    };
                    this.searchWorker.postMessage(workerMessage);
                }
            } else {
                this.searchWorker.postMessage({ type: "clearFilter" });
            }
        },
        onSearch() {
            for (const [filter, value] of Object.entries(this.filterSettings)) {
                if (!value) {
                    delete this.filterSettings[filter];
                }
            }
            this.$router.push({ path: "/tools/list", query: this.filterSettings });
        },
        onToggle(toggleAdvanced) {
            this.$emit("update:show-advanced", toggleAdvanced);
        },
    },
};
</script>
