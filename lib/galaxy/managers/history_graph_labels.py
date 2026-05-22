"""Tool input/output display-label resolution for the history graph.

The history graph maps each tool node to *many* tool_requests that may have
exercised different conditional cases, so labels are collected across **all**
cases of every conditional and cached per tool — state-free and static.

This is intentionally NOT shared with ``workflow.modules.ToolModule``'s
``get_all_inputs``/``get_all_outputs``: those resolve labels for one step's
concrete state (active conditional case only, templated output labels rendered
against that state). The two needs only look alike — unifying them would force
a step-state abstraction onto this state-free, per-tool resolver.
"""

from typing import Optional

from galaxy.exceptions import MessageException
from galaxy.tool_util.toolbox import AbstractToolBox
from galaxy.util.template import fill_template


class ToolLabelResolver:
    """Resolve and cache a tool's input/output parameter display labels."""

    def __init__(self, toolbox: Optional[AbstractToolBox]):
        self._toolbox = toolbox
        self._input_cache: dict[str, dict[str, str]] = {}
        self._output_cache: dict[str, dict[str, str]] = {}

    def input_labels(self, tool_id: Optional[str]) -> dict[str, str]:
        """Connection name -> display label for a tool's input parameters,
        across every conditional case. The connection-name form matches the
        names produced by ``request_internal_input_refs``. Empty when the
        toolbox is unavailable or the tool is not found; callers fall back to
        the parameter name."""
        if tool_id is None:
            return {}
        if tool_id not in self._input_cache:
            labels: dict[str, str] = {}
            tool = self._get_tool(tool_id)
            if tool is not None:
                _collect_input_labels(tool.inputs, "", labels)
            self._input_cache[tool_id] = labels
        return self._input_cache[tool_id]

    def output_labels(self, tool_id: Optional[str]) -> dict[str, str]:
        """Output name -> display label for a tool — the descriptive part of
        each output's label (see ``_output_label``). Empty when the toolbox is
        unavailable or the tool is not found; callers fall back to the plain
        output name."""
        if tool_id is None:
            return {}
        if tool_id not in self._output_cache:
            labels: dict[str, str] = {}
            tool = self._get_tool(tool_id)
            if tool is not None:
                for name, output in {**tool.outputs, **tool.output_collections}.items():
                    label = _output_label(output, tool)
                    if label:
                        labels[name] = label
            self._output_cache[tool_id] = labels
        return self._output_cache[tool_id]

    def _get_tool(self, tool_id: str):
        if self._toolbox is None:
            return None
        try:
            return self._toolbox.get_tool(tool_id)
        except MessageException:
            return None


def _collect_input_labels(inputs: dict, prefix: str, labels: dict[str, str]) -> None:
    """Recursively collect leaf parameter labels keyed by their ``|``-joined
    connection name, descending through conditionals (all cases), repeats and
    sections so nested data parameters resolve."""
    for name, param in inputs.items():
        path = f"{prefix}{name}"
        cases = getattr(param, "cases", None)
        if cases is not None:
            for case in cases:
                _collect_input_labels(case.inputs, f"{path}|", labels)
            continue
        group_inputs = getattr(param, "inputs", None)
        if group_inputs is not None:
            _collect_input_labels(group_inputs, f"{path}|", labels)
            continue
        label = getattr(param, "label", None)
        if label:
            labels[path] = label


def _output_label(output, tool) -> Optional[str]:
    """Human label for a tool output: the descriptive tail after the
    conventional ``${tool.name} on ${on_string}:`` prefix. Templated text is
    rendered against a placeholder context; returns None when the output has no
    label or it cannot be rendered, so callers fall back to the output name."""
    label = getattr(output, "label", None)
    if not label:
        return None
    # Convention: "<tool> on <inputs>: <descriptive>" — keep the descriptive tail.
    descriptive = label.split(": ", 1)[-1]
    if "$" in descriptive:
        try:
            descriptive = fill_template(
                descriptive,
                context={"tool": tool, "on_string": "input dataset(s)"},
                python_template_version=getattr(tool, "python_template_version", None),
            )
        except Exception:
            return None
    descriptive = descriptive.strip()
    return descriptive or None
