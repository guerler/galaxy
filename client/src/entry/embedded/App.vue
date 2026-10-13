<template>
    <div id="app" class="embedded-view">
        <router-view />
    </div>
</template>

<script setup lang="ts">
import { useHistoryStore } from "@/stores/historyStore";
import { useUserStore } from "@/stores/userStore";

// Views compare ownership against the current user, so the user is loaded as in the analysis app.
useUserStore().loadUser();

// Views refresh when their history's update_time changes, which the history watcher keeps fresh.
useHistoryStore().startWatchingHistory();
</script>

<style lang="scss">
@import "../../style/scss/custom_theme_variables.scss";

// Views size themselves to their parent, as in the analysis app's center panel.
.embedded-view {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: auto;
}
</style>
