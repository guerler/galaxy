<template>
    <div :class="nodeClass">
        <div class="node-header unselectable clearfix">
            <b-button
                class="node-destroy py-0 px-1 float-right"
                size="sm"
                aria-label="destroy node"
                variant="primary"
                @click="onDestroy"
            >
                <i class="fa fa-fw fa-times" />
            </b-button>
            <b-button
                class="node-clone py-0 px-1 float-right"
                size="sm"
                aria-label="clone node"
                variant="primary"
                @click="onClone"
            >
                <i class="fa fa-fw fa-files-o" />
            </b-button>
            <span class="node-title">{{ title }}</span>
        </div>
        <div class="node-body">
            <div>
                <loading-span message="Loading details" />
            </div>
        </div>
    </div>
</template>

<script>
import Vue from "vue";
import BootstrapVue from "bootstrap-vue";
import LoadingSpan from "components/LoadingSpan";

Vue.use(BootstrapVue);

export default {
    components: {
        LoadingSpan,
    },
    props: {
        id: {
            type: String,
            default: "",
        },
        title: {
            type: String,
            default: "title",
        },
        type: {
            type: String,
            default: "tool",
        },
        node: {
            type: Object,
            default: null,
        },
    },
    computed: {
        nodeClass() {
            return `node-type-${this.type}`;
        }
    },
    methods: {
        onDestroy() {
            this.node.destroy();
        },
        onClone() {
            this.node.clone();
        },
    },
};
</script>
