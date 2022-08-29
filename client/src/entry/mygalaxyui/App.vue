<template>
    <div id="app">
        <div id="everything">
            <div id="background" />
            <Masthead
                id="masthead"
                :base-tabs="baseTabs"
                :brand="config.brand"
                :brand-link="staticUrlToPrefixed(config.logo_url)"
                :brand-image="staticUrlToPrefixed(config.logo_src)"
                :brand-image-secondary="staticUrlToPrefixed(config.logo_src_secondary)"
                :display-galaxy-brand="config.display_galaxy_brand"
                :masthead-state="mastheadState" />
            <router-view @update:confirmation="confirmation = $event" />
        </div>
    </div>
</template>
<script>
import { MastheadState } from "layout/masthead";
import Masthead from "components/Masthead/Masthead.vue";
import { getGalaxyInstance } from "app";
import { getAppRoot } from "onload";
import { fetchMenu } from "./menu";

export default {
    components: {
        Masthead,
    },
    data() {
        return {
            config: getGalaxyInstance().config,
            confirmation: null,
            mastheadState: new MastheadState(),
        };
    },
    computed: {
        baseTabs() {
            return fetchMenu(this.config);
        },
    },
    methods: {
        staticUrlToPrefixed(url) {
            return url?.startsWith("/") ? `${getAppRoot()}${url.substring(1)}` : url;
        },
    },
};
</script>
