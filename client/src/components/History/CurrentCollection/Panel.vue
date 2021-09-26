<!-- When a dataset collection is being viewed, this panel shows the contents of that collection -->

<template>
    <UrlDataProvider v-if="selectedCollection && selectedCollection.contents_url" :url="getUrl(selectedCollection.contents_url)" v-slot="{ result: payload, loading }">
        <ExpandedItems
            :scope-key="selectedCollection.id"
            :get-item-key="(item) => item.type_id"
            v-slot="{ isExpanded, setExpanded }"
        >
            <Layout class="dataset-collection-panel">
                <template v-slot:globalNav>
                    <TopNav :history="history" :selected-collections="selectedCollections" v-on="$listeners" />
                </template>

                <template v-slot:localNav>
                    <IconButton
                        icon="download"
                        title="Download Collection"
                        :href="downloadCollectionUrl"
                        download
                    />
                </template>

                <template v-slot:details>
                    <Details :dsc="getDatasetCollection(selectedCollection)" :writable="writable" @update:dsc="updateDsc(selectedCollection, $event)" />
                </template>

                <template v-slot:listing>
                    <div ref="listing" class="listing">
                        <ul class="list-unstyled m-0">
                            <li
                                v-for="(item, index) in payload"
                                :key="getItemKey(item)"
                                :data-row-index="index"
                                :data-row-key="getItemKey(item)"
                            >
                                <CollectionContentItem
                                    :item="getItem(item)"
                                    :index="index"
                                    :row-key="getItemKey(item)"
                                    :expanded="isExpanded(item)"
                                    :writable="false"
                                    :selectable="false"
                                    @update:expanded="setExpanded(item, $event)"
                                    @viewCollection="$emit('viewCollection', item)"
                                    :data-index="index"
                                    :data-row-key="getItemKey(item)"
                                />
                            </li>
                        </ul>
                    </div>

                </template>
            </Layout>
        </ExpandedItems>
    </UrlDataProvider>
</template>

<script>
import { History } from "../model";
import { updateContentFields } from "../model/queries";
import { cacheContent } from "../caching";

import { UrlDataProvider } from "components/providers/UrlDataProvider";
import { ExpandedItems } from "../providers";
import Layout from "../Layout";
import TopNav from "./TopNav";
import Details from "./Details";
import Scroller from "../Scroller";
import { CollectionContentItem } from "../ContentItem";
import { DatasetCollection } from "../model";

import { reportPayload } from "../providers/ContentProvider/helpers";
import IconButton from "components/IconButton";

export default {
    filters: {
        reportPayload,
    },
    components: {
        Layout,
        TopNav,
        Details,
        Scroller,
        CollectionContentItem,
        ExpandedItems,
        IconButton,
        UrlDataProvider,
    },
    props: {
        history: { type: History, required: true },
        selectedCollections: { type: Array, required: true },
    },
    computed: {
        selectedCollection() {
            const arr = this.selectedCollections;
            const selected = arr[arr.length - 1];
            return selected;
        },
        isRoot() {
            return this.selectedCollection == this.selectedCollections[0];
        },
        writable() {
            return this.isRoot;
        },
        rootCollection() {
            return this.selectedCollections[0];
        },
        downloadCollectionUrl() {
            let url = "";
            if (this.rootCollection) {
                url = `${this.rootCollection.url}/download`;
            }
            return url;
        },
    },
    methods: {
        getDatasetCollection(selectedCollection) {
            return new DatasetCollection(selectedCollection);
        },
        getItem(item) {
            return {...item, ...item.object};
        },
        getItemKey(item) {
            return item["element_index"];
        },
        getUrl(url) {
            return url.substring(1);
        },
        setScrollPos() {
        },
        // change the data of the root collection, anything past the root
        // collection is part of the dataset collection, which i believe is supposed to
        // be immutable, so only edit name, tags, blah of top-level selected collection,
        async updateDsc(collection, fields) {
            if (this.writable) {
                const ajaxResult = await updateContentFields(collection, fields);
                await cacheContent({ ...collection, ...ajaxResult });
            }
        },
    },
};
</script>
