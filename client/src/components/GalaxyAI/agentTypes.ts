import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faBook,
    faBug,
    faFileContract,
    faGraduationCap,
    faHistory,
    faMagic,
    faPlus,
    faQuestionCircle,
    faRobot,
    faRoute,
    faSitemap,
    faTools,
} from "@fortawesome/free-solid-svg-icons";

import { AGENT_LABELS } from "@/components/Page/constants";

export interface AgentType {
    value: string;
    label: string;
    icon: IconDefinition;
    description: string;
}

export const agentTypes: AgentType[] = [
    { value: "auto", label: "Auto (Router)", icon: faMagic, description: "Intelligent routing" },
    { value: "router", label: "Router", icon: faRoute, description: "Query router" },
    { value: "error_analysis", label: "Error Analysis", icon: faBug, description: "Debug tool errors" },
    { value: "custom_tool", label: "Custom Tool", icon: faPlus, description: "Create custom tools" },
    {
        value: "tool_recommendation",
        label: "Tool Recommendation",
        icon: faTools,
        description: "Recommend tools & workflows",
    },
    { value: "orchestrator", label: "Orchestrator", icon: faSitemap, description: "Coordinates multiple steps" },
    { value: "history", label: "History", icon: faHistory, description: "Summarize your analysis" },
    { value: "workflow_report", label: "Workflow Report", icon: faFileContract, description: "Workflow run reports" },
    { value: "gtn_training", label: "GTN Training", icon: faGraduationCap, description: "Find tutorials" },
    { value: "clarification", label: "Clarification", icon: faQuestionCircle, description: "Needs more info" },
    {
        value: "page_assistant",
        label: AGENT_LABELS.pageAssistantLabel,
        icon: faBook,
        description: AGENT_LABELS.pageAssistantDescription,
    },
];

export function getAgentIcon(agentType?: string): IconDefinition {
    return agentTypes.find((a) => a.value === agentType)?.icon || faRobot;
}
