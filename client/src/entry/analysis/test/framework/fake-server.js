import axios from "axios";
import ToolJson from "../json/tool.json";
import WorkflowJson from "../json/workflow.json";
import MockAdapter from "axios-mock-adapter";
import { getAppRoot } from "onload/loadConfig";
jest.mock("onload/loadConfig");
getAppRoot.mockImplementation(() => "/");

export function createServer() {
    const axiosMock = new MockAdapter(axios);
    axiosMock.onGet(`/api/licenses`).reply(200, {
        data: {},
    });
    axiosMock.onGet(`/api/workflows/workflow_id/versions`).reply(200, []);
    axiosMock.onGet(`/workflow/load_workflow?_=true&id=workflow_id&version=1`).reply(200, WorkflowJson);
    axiosMock.onGet(`/api/tools/cat1/build`).reply(200, ToolJson);
    axiosMock.onPost(`/api/tools/cat1/build`).reply(200, ToolJson);
    axiosMock.onGet(`/history/current_history_json`).reply(200, { id: "history_id" });
    axiosMock
        .onGet(
            `api/histories/history_id/contents?limit=1000&q=update_time-ge&qv=2022-02-01T05%3A00%3A00.000Z&v=dev&view=detailed`
        )
        .reply(200, []);
    axiosMock.onGet(`/api/licenses`).reply(200, {});
    axiosMock.onGet(`/api/datatypes/types_and_mapping`).reply(200, {
        datatypes: [],
    });
}
