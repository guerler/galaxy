import { h } from "vue";
import type { RouteRecordRaw } from "vue-router";

import GAlert from "@/components/BaseComponents/GAlert.vue";

/** Galaxy's encoded ids, so an analysis path such as `/histories/view` is never read as one. */
const ID = "[0-9a-f]+";

/**
 * The public routes of the embedded app, relative to `/embedded/`. These paths are a contract with
 * external consumers. Each view is bounded to its resource and never navigates away from it.
 */
export const embeddedRoutes: RouteRecordRaw[] = [
    {
        path: `/histories/:historyId(${ID})/graph`,
        component: () => import("./HistoryGraph.vue"),
        props: (route) => ({
            historyId: route.params.historyId,
            seedSrc: route.query.seed_src,
            seedId: route.query.seed_id,
        }),
    },
    {
        path: "/:pathMatch(.*)*",
        component: { render: () => h(GAlert, { variant: "danger", show: true }, () => "This view does not exist.") },
    },
];
