import axios from "axios";
import ToolJson from "../json/tool.json";
import WorkflowJson from "../json/workflow.json";
import MockAdapter from "axios-mock-adapter";
import { getAppRoot } from "onload/loadConfig";

getAppRoot.mockImplementation(() => "prefix/");

export function createServer() {
    const axiosMock = new MockAdapter(axios);
    axiosMock.onGet(`prefix/api/licenses`).reply(200, {
        data: {},
    });
    axiosMock.onGet(`prefix/api/workflows/workflow_id/versions`).reply(200, []);
    axiosMock.onGet(`prefix/workflow/load_workflow?_=true&id=workflow_id&version=1`).reply(200, WorkflowJson);
    axiosMock.onGet(`/api/tools/cat1/build`).reply(200, ToolJson);
    axiosMock.onPost(`/api/tools/cat1/build`).reply(200, ToolJson);
}
