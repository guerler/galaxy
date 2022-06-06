import { mount } from "@vue/test-utils";
import { getLocalVue } from "jest/helpers";
import store from "store";
import Application from "entry/analysis/App";
import Home from "entry/analysis/modules/Home";
import { getRouter } from "entry/analysis/router";

import MockConfig from "components/providers/MockConfigProvider";
import MockCurrentUser from "components/providers/MockCurrentUser";
import MockCurrentHistory from "components/providers/MockHistoryItemsProvider";
import { getGalaxyInstance } from "app";

const localVue = getLocalVue();

jest.mock("app");

export default function mountComponent() {
    const Galaxy = getGalaxyInstance();
    const router = getRouter(Galaxy);
    Galaxy.router = router;
    return mount(Application, {
        propsData: {
            config: {},
            query: {},
        },
        router,
        store,
        localVue,
        attachTo: document.body,
        stubs: {
            ConfigProvider: MockConfig({ id: "fakeconfig" }),
            CurrentUser: MockCurrentUser({ user: "fakeuser" }),
            UserHistories: MockCurrentHistory({}),
            HistoryItemsProvider: MockCurrentHistory({}),
        },
    });
}
