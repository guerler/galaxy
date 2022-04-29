<template>
    <div
        class="listing-layout"
        @scroll.prevent="onScrollThrottle"
        @mousewheel.prevent="onScrollThrottle"
        @wheel.prevent="onScrollThrottle"
        @DOMMouseScroll.prevent="onScrollThrottle">
        <virtual-list ref="listing" class="listing" data-key="id" :data-sources="items" :data-component="{}">
            <template v-slot:item="{ item }">
                <slot name="item" :item="item" />
            </template>
            <template v-slot:footer>
                <LoadingSpan v-if="loading" class="m-2" message="Loading" />
            </template>
        </virtual-list>
    </div>
</template>
<script>
import VirtualList from "vue-virtual-scroll-list";
import { throttle } from "lodash";
import LoadingSpan from "components/LoadingSpan";

export default {
    components: {
        LoadingSpan,
        VirtualList,
    },
    props: {
        loading: { type: Boolean, default: false },
        items: { type: Array, default: null },
        queryKey: { type: String, default: null },
    },
    data() {
        return {
            throttlePeriod: 20,
            deltaMax: 50,
        };
    },
    watch: {
        queryKey() {
            this.$refs.listing.scrollToOffset(0);
        },
    },
    created() {
        this.onScrollThrottle = throttle((event) => {
            this.onScroll(event);
        }, this.throttlePeriod);
    },
    methods: {
        onScroll(event) {
            console.log(event);
            // this avoids diagonal scrolling, we either scroll left/right or top/down
            // both events are throttled and the default handler has been prevented.
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                // handle vertical scrolling with virtual scroller
                const listing = this.$refs.listing;
                const deltaMax = this.deltaMax;
                const deltaY = Math.max(Math.min(event.deltaY, deltaMax), -deltaMax);
                this.offset = Math.max(0, listing.getOffset() + deltaY);
                this.$refs.listing.scrollToOffset(this.offset);
                this.$emit("scroll", this.$refs.listing.range.start);
            } else {
                // dispatch horizontal scrolling as regular event
                var wheelEvent = new WheelEvent("wheel", {
                    deltaX: event.deltaX,
                    bubbles: true,
                    cancelable: false,
                });
                event.target.dispatchEvent(wheelEvent);
            }
        },
    },
};
</script>

<style scoped lang="scss">
@import "scss/mixins.scss";
.listing-layout {
    .listing {
        @include absfill();
        overflow: scroll;
    }
}
</style>
