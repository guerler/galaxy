import { mount } from "@vue/test-utils";
import { getLocalVue } from "jest/helpers";
import MockConfigProvider from "components/providers/MockConfigProvider";
import store from "store";
import Index from "components/Workflow/Editor/Index";

const localVue = getLocalVue();

jest.mock("components/Datatypes/factory");
jest.mock("layout/modal");
jest.mock("onload/loadConfig");
jest.mock("components/Workflow/Editor/modules/utilities");
jest.mock("components/Workflow/Editor/modules/canvas");
jest.mock("app");

import { getDatatypesMapper } from "components/Datatypes/factory";
import { testDatatypesMapper } from "components/Datatypes/test_fixtures";
import { getStateUpgradeMessages } from "components/Workflow/Editor/modules/utilities";

export default function mountComponent() {
    getDatatypesMapper.mockResolvedValue(testDatatypesMapper);
    getStateUpgradeMessages.mockImplementation(() => []);
    return mount(Index, {
        propsData: {
            id: "workflow_id",
            initialVersion: 1,
            tags: ["moo", "cow"],
            moduleSections: [],
            dataManagers: [],
            workflows: [],
            toolbox: [],
        },
        store,
        localVue,
        attachTo: document.body,
        stubs: {
            ConfigProvider: MockConfigProvider({ id: "fakeconfig" }),
        },
    });
}
