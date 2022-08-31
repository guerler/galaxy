import Vue from "vue";
import VueRouter from "vue-router";
import { getAppRoot } from "onload/loadConfig";
import Base from "./Base";
import WorkflowList from "components/Workflow/WorkflowList";

Vue.use(VueRouter);

export function getRouter() {
    return new VueRouter({
        base: getAppRoot(),
        mode: "history",
        routes: [
            {
                path: "/",
                component: Base,
                children: [
                    {
                        name: "home",
                        path: "",
                        component: WorkflowList,
                    },
                    {
                        name: "workflows",
                        path: "workflows/list",
                        component: WorkflowList,
                    },
                ],
            },
        ],
    });
}
