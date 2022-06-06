import Home from "./Home";
import Tool from "./Tool";
import WorkflowEditorIndex from "./WorkflowEditorIndex";

export default {
    "/": Home,
    "/?tool_id=cat1": Tool,
    "workflow/editor/index": WorkflowEditorIndex,
    __control__: Home,
};
