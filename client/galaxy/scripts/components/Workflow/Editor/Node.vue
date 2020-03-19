<template>
    <div>
        <div class="node-header unselectable clearfix">
            <b-button
                class="node-destroy py-0 float-right"
                variant="primary"
                size="sm"
                aria-label="destroy node"
                @click="onDestroy"
            >
                <i class="fa fa-times" />
            </b-button>
            <b-dropdown
                right
                no-caret
                class="node-dropdown float-right"
                toggle-class="py-0 px-1"
                offset="50"
                variant="primary"
                size="sm"
            >
                <template v-slot:button-content>
                    <i class="fa fa-fw fa-caret-down" />
                </template>
                <b-dropdown-item aria-label="clone node" role="button" href="#" class="node-clone" @click="onClone">
                    <span class="fa fa-fw fa-files-o" />
                    Duplicate
                </b-dropdown-item>
            </b-dropdown>
            <span class="node-title ml-1">{{ title }}</span>
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
