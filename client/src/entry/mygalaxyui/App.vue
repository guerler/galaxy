<template>
    <div id="app">
        <div id="everything">
            <div id="background" />
            <Masthead
                :display-galaxy-brand="config.display_galaxy_brand"
                :brand="config.brand"
                :logo-url="config.logo_url"
                :logo-src="config.logo_src"
                :logo-src-secondary="config.logo_src_secondary"
                :tabs="tabs"
                @open-url="openUrl" />
            <div id="columns">
                <div id="center">
                    <div class="center-container">
                        <div class="center-panel" style="display: block">
                            <router-view />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import Masthead from "components/Masthead/Masthead";
import { getGalaxyInstance } from "app";
import { safePath } from "utils/redirect";

export default {
    components: {
        Masthead,
    },
    data() {
        return {
            config: getGalaxyInstance().config,
        };
    },
    computed: {
        tabs() {
            return [
                {
                    url: "/?app_name=mygalaxyui",
                    icon: "fa-home",
                },
                {
                    title: _l("Workflows"),
                    url: "/workflows/list?app_name=mygalaxyui",
                },
                {
                    title: _l("Invocations"),
                    url: "/workflows/invocations",
                    target: "_top",
                },
            ];
        },
    },
    methods: {
        openUrl(tab) {
            const route = this.$router.resolve(tab.url);
            if (route.resolved.name) {
                this.$router.push(tab.url);
            } else {
                window.location = safePath(tab.url);
            }
        },
    },
};
</script>
