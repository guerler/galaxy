export interface ChatHistoryItem {
    id: string;
    query: string;
    response: string;
    agent_type: string;
    timestamp: string;
    feedback?: number | null;
    message_count?: number;
}
