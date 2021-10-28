<template>
    <div ref="container" class="scrollContainer" @wheel.prevent="onWheel">
        <div ref="listing" class="listing">
            <ul class="list-unstyled m-0">
                <li
                    v-for="(item, index) in contents"
                    :key="getItemKey(item)"
                    :data-row-index="index"
                    :data-row-key="getItemKey(item)"
                >
                    <slot :item="item" :index="index" :row-key="getItemKey(item)">
                        <pre>{{ item }}</pre>
                    </slot>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { SearchParams } from "./model";

export default {
    props: {
        // field in the item data that represents the "primary" key, less for caching purposes than
        // Vue re-rendering comparison purposes. Should be a unique value from the list of data, and
        // is typically HID for history contents and element_index for collection contents
        keyField: { type: String, required: true },

        // A list of items to render in the immediate region of the scroll pos
        contents: { type: Array, required: true },

        // index from contents to start rendering, will be 0 for top of list,
        // we provide more contents than are currently rendered so the user can quickly
        // scroll outside the immediate window and still have a little data
        startKeyIndex: { type: Number, default: 0 },

        // known total matches for this list of content independent of pagination or
        // view windowing concerns, the raw data row count
        totalMatches: { type: Number, default: 0 },

        // number of undelivered rows above contents
        topRows: { type: Number, default: 0 },
        bottomRows: { type: Number, default: 0 },

        // Number of items from contents to render starting from the startKeyIndex
        pageSize: { type: Number, default: SearchParams.pageSize },

        // avoid an infinite loop when we visually adjust the scroller bar upon
        // receiving new content by suppressing outgoing update events until the
        // DOM update has finished.
        suppressionPeriod: { type: Number, default: 10 },

        // debug flag
        debug: { type: Boolean, default: false },
    },
};
</script>
