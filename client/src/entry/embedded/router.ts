import { createRouter, createWebHistory, type RouterHistory } from "vue-router";

import { getAppRoot } from "@/onload/loadConfig";

import { embeddedRoutes } from "./routes";

export function getRouter(history: RouterHistory = createWebHistory(`${getAppRoot()}embedded/`)) {
    return createRouter({ history, routes: embeddedRoutes });
}
