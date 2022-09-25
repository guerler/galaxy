import { mount } from "@vue/test-utils";
import { getLocalVue } from "jest/helpers";
import store from "store";
import Home from "entry/analysis/modules/Home";
import MockConfig from "components/providers/MockConfigProvider";
import MockCurrentUser from "components/providers/MockCurrentUser";
import MockCurrentHistory from "components/providers/MockCurrentHistory";

const localVue = getLocalVue();

jest.mock("app");

export default function mountComponent() {
    return mount(Home, {
        propsData: {
            config: {},
            query: {
                tool_id: "cat1",
            },
        },
        store,
        localVue,
        attachTo: document.body,
        stubs: {
            ConfigProvider: MockConfig({ id: "fakeconfig" }),
            CurrentUser: MockCurrentUser({ user: "fakeuser" }),
            UserHistories: MockCurrentHistory(),
        },
    });
}
