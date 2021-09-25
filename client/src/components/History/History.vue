<template>
    <UrlDataProvider v-if="history && history.contents_url" :url="getUrl(history.contents_url)" v-slot="{ result: payload, loading }">
        <ExpandedItems
            :scope-key="history.id"
            :get-item-key="(item) => item.type_id"
            v-slot="{ expandedCount, isExpanded, setExpanded, collapseAll }"
        >
            <SelectedItems
                :scope-key="history.id"
                :get-item-key="(item) => item.type_id"
                v-slot="{
                    selectedItems,
                    showSelection,
                    setShowSelection,
                    selectItems,
                    isSelected,
                    setSelected,
                    resetSelection,
                }"
            >
                <Layout>
                    <template v-slot:globalNav>
                        <slot name="globalNav" :history="history"></slot>
                    </template>

                    <template v-slot:localNav>
                        <HistoryMenu :history="history" v-on="$listeners" />
                    </template>

                    <template v-slot:details>
                        <HistoryDetails :history="history" v-on="$listeners" />
                    </template>

                    <template v-slot:messages>
                        <HistoryMessages class="m-2" :history="history" />
                    </template>

                    <template v-slot:listing>
                        <HistoryEmpty v-if="history.empty" class="m-2" />
                        <HistoryEmpty v-else-if="payload && payload.noResults" message="No Results." class="m-2" />
                        <div ref="listing" class="listing">
                            <ul class="list-unstyled m-0">
                                <li
                                    v-for="(item, index) in payload"
                                    :key="getItemKey(item)"
                                    :data-row-index="index"
                                    :data-row-key="getItemKey(item)"
                                >
                                    <HistoryContentItem
                                        :item="getItem(item)"
                                        :index="index"
                                        :row-key="getItemKey(item)"
                                        :show-selection="showSelection"
                                        :expanded="isExpanded(item)"
                                        @update:expanded="setExpanded(item, $event)"
                                        :selected="isSelected(item)"
                                        @update:selected="setSelected(item, $event)"
                                        @viewCollection="$emit('viewCollection', item)"
                                        :data-hid="item.hid"
                                        :data-index="index"
                                        :data-row-key="getItemKey(item)"
                                    />
                                </li>
                            </ul>
                        </div>
                    </template>

                    <template v-slot:modals>
                        <ToolHelpModal />
                    </template>
                </Layout>
            </SelectedItems>
        </ExpandedItems>
    </UrlDataProvider>
</template>

<script>
import { UrlDataProvider } from "components/providers/UrlDataProvider";
import { History, SearchParams } from "./model";
import { HistoryContentProvider, ExpandedItems, SelectedItems } from "./providers";
import Layout from "./Layout";
import HistoryMessages from "./HistoryMessages";
import HistoryDetails from "./HistoryDetails";
import HistoryEmpty from "./HistoryEmpty";
import ContentOperations from "./ContentOperations";
import ToolHelpModal from "./ToolHelpModal";
import Scroller from "./Scroller";
import { HistoryContentItem } from "./ContentItem";
import { reportPayload } from "./providers/ContentProvider/helpers";
import HistoryMenu from "./HistoryMenu";
import Vue from "vue";

Vue.config.performance = true

export default {
    filters: {
        reportPayload,
    },
    components: {
        UrlDataProvider,
        HistoryContentProvider,
        Layout,
        HistoryMessages,
        HistoryDetails,
        HistoryEmpty,
        ContentOperations,
        ToolHelpModal,
        Scroller,
        HistoryContentItem,
        ExpandedItems,
        SelectedItems,
        HistoryMenu,
    },
    props: {
        history: { type: History, required: true },
    },
    data() {
        return {
            params: new SearchParams(),
            useItemSelection: false,
        };
    },
    computed: {
        historyId() {
            return this.history.id;
        },
    },
    methods: {
        getItem(item) {
            return {...item, ...item.object};
        },
        getItemKey(item) {
            return item["id"];
        },
        getUrl(url) {
            return url.substring(1);
        },
        manualReload() {
        },
        setScrollPos() {
        },
    }
};
</script>
