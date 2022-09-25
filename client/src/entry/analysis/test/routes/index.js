import App from "./App";
import Home from "./Home";
import Tool from "./Tool";
import WorkflowEditorIndex from "./WorkflowEditorIndex";

export default {
    _: App,
    "/": Home,
    "/?tool_id=cat1": Tool,
    "workflow/editor/index": WorkflowEditorIndex,
    __control__: Home,
};
