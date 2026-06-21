export interface ToolCallChunk {
  name?: string;
  args?: string;
  id?: string;
  index?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface UserMessage {
  kind: 'user';
  id: string;
  content: string;
  timestamp: Date;
}

export interface AssistantMessage {
  kind: 'assistant';
  id: string;
  content: string;
  thinking?: string;
  timestamp: Date;
}

export interface ToolCallEntry {
  kind: 'tool_call';
  id: string;
  name: string;
  args: Record<string, unknown> | null;
  argsRaw?: string;
  status: 'running' | 'complete';
  result?: string;
  timestamp: Date;
}

export interface UIToolCallEntry {
  kind: 'ui_tool_call';
  id: string;
  name: string;
  toolId: string;
  args: Record<string, unknown>;
  status: 'pending_input' | 'complete';
  result?: string;
  timestamp: Date;
}

export type ConversationEntry = UserMessage | AssistantMessage | ToolCallEntry | UIToolCallEntry;

export interface BackendEvent {
  eventType: string;
  customEventName?: string;
  eventData: Record<string, unknown> | string;
}

export interface ChatRequest {
  message?: string;
  threadId?: string;
  commandResponse?: Record<string, unknown>;
  frontendTools?: ToolMetadata[];
}

export interface ToolMetadata {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface PendingToolCall {
  toolName: string;
  toolId: string;
  args: Record<string, unknown>;
  resolve: (result: Record<string, unknown>) => void;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  render: React.ComponentType<{ args: TInput; onSubmit: (result: TOutput) => void }>;
  handle: (args: TInput, result: TOutput) => Record<string, unknown>;
}
