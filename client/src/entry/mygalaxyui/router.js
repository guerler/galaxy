import Vue from "vue";
import VueRouter from "vue-router";
import { getAppRoot } from "onload/loadConfig";

// these modules are mounted below the masthead.
import MyModule from "entry/mygalaxyui/modules/MyModule";

// child components
import AboutGalaxy from "components/AboutGalaxy.vue";
import WorkflowList from "components/Workflow/WorkflowList";

Vue.use(VueRouter);

// produces the client router
export function getRouter() {
    return new VueRouter({
        base: getAppRoot(),
        mode: "history",
        routes: [
            {
                path: "/",
                component: MyModule,
                children: [
                    {
                        path: "about",
                        component: AboutGalaxy,
                    },
                    {
                        path: "workflows/list",
                        component: WorkflowList,
                    },
                ],
            },
        ],
    });
}
