"""Resolve the structured request_internal payload backing an execution.

Every execution that captured a structured request — async tool-request
submission or workflow tool step — has a :class:`ToolRequest` row reachable
via ``Job.tool_request`` (or ``ImplicitCollectionJobs.structured_request``).
This module is the single seam consumers use to read that payload, gated on
``ToolRequest.request_state == "validated"``.
"""

import json
import logging
from typing import Optional

from galaxy.model import (
    ImplicitCollectionJobs,
    Job,
    ToolRequest,
)
from galaxy.tool_util.parameters import RequestInternalToWorkflowStateError

log = logging.getLogger(__name__)

VALIDATED_REQUEST_STATE = "validated"


def tool_request_payload(tool_request: ToolRequest) -> dict:
    """Return the structured request_internal payload stored on a ToolRequest."""
    payload = json.loads(tool_request.request) if isinstance(tool_request.request, str) else tool_request.request
    if not isinstance(payload, dict):
        raise RequestInternalToWorkflowStateError(f"ToolRequest {tool_request.id} has malformed request payload")
    return payload


def resolve_structured_request_payload(
    job: Optional[Job] = None,
    icj: Optional[ImplicitCollectionJobs] = None,
) -> Optional[dict]:
    """Return the validated request_internal payload for an execution unit,
    or ``None`` when no validated capture exists (caller degrades to the
    legacy state walk)."""
    tool_request = icj.structured_request if icj is not None else (job.tool_request if job is not None else None)
    if tool_request is None or tool_request.request_state != VALIDATED_REQUEST_STATE:
        return None
    return tool_request_payload(tool_request)
