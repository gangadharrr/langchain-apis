import { useState, useRef, useCallback } from 'react';
import type {
  ConversationEntry,
  UserMessage,
  AssistantMessage,
  ToolCallEntry,
  UIToolCallEntry,
  ToolMetadata,
} from '../types';
import { streamChat } from '../api/chat';
import { extractThinking } from '../utils/extract-think';

let idCounter = 0;

function uid(): string {
  return `e-${++idCounter}`;
}

function userMsg(content: string): UserMessage {
  return { kind: 'user', id: uid(), content, timestamp: new Date() };
}

function assistantMsg(content: string): AssistantMessage {
  return { kind: 'assistant', id: uid(), content, timestamp: new Date() };
}

function toolCallEntry(name: string): ToolCallEntry {
  return { kind: 'tool_call', id: uid(), name, args: null, status: 'running', timestamp: new Date() };
}

function uiToolCallEntry(name: string, toolId: string, args: Record<string, unknown>): UIToolCallEntry {
  return { kind: 'ui_tool_call', id: uid(), name, toolId, args, status: 'pending_input', timestamp: new Date() };
}

function parseArgs(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function appendAIText(entries: ConversationEntry[], text: string): AssistantMessage {
  const last = entries[entries.length - 1];
  if (last?.kind === 'assistant') {
    const raw = last.content + text;
    const { clean, thinking } = extractThinking(raw);
    const updated: AssistantMessage = thinking !== undefined
      ? { ...last, content: clean, thinking }
      : { ...last, content: clean };
    entries[entries.length - 1] = updated;
    return updated;
  }
  const raw = text;
  const { clean, thinking } = extractThinking(raw);
  const msg = assistantMsg(clean);
  if (thinking !== undefined) msg.thinking = thinking;
  entries.push(msg);
  return msg;
}

function findLastToolCall(arr: ConversationEntry[]): ToolCallEntry | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].kind === 'tool_call') return arr[i] as ToolCallEntry;
  }
  return undefined;
}

function findLastPendingUIToolCall(arr: ConversationEntry[]): UIToolCallEntry | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    const entry = arr[i];
    if (entry.kind === 'ui_tool_call' && entry.status === 'pending_input') return entry;
  }
  return undefined;
}

export function useChat(getToolMetadata?: () => ToolMetadata[]) {
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const processEvents = useCallback(async (
    request: { message?: string; commandResponse?: Record<string, unknown> },
  ) => {
    const abortController = new AbortController();
    abortRef.current = abortController;

    const toolArgsMap = new Map<string, string>();
    const toolIndexMap = new Map<number, ToolCallEntry>();

    const frontendTools = getToolMetadata?.();

    try {
      for await (const event of streamChat(
        { ...request, threadId: threadIdRef.current, frontendTools },
        abortController.signal,
      )) {
        if (event.eventType === 'RUN_STARTED') {
          const data = event.eventData as Record<string, unknown>;
          if (data.threadId) threadIdRef.current = data.threadId as string;
        } else if (event.eventType === 'TEXT_MESSAGE_CONTENT') {
          const text = (event.eventData as Record<string, unknown>).aiMessage as string ?? '';
          if (!text) continue;
          setEntries(prev => {
            const updated = [...prev];
            appendAIText(updated, text);
            return updated;
          });
        } else if (event.eventType === 'TOOL_CALL_ARGS') {
          const data = event.eventData as Record<string, unknown>;
          const text = data.aiMessage as string ?? '';

          if (text) {
            setEntries(prev => {
              const updated = [...prev];
              appendAIText(updated, text);
              return updated;
            });
          }

          const chunks = data.toolCallChunks as
            | Array<{ name?: string; id?: string; args?: string; index?: number }>
            | undefined;

          if (chunks) {
            setEntries(prev => {
              const updated = [...prev];
              for (const chunk of chunks) {
                const idx = chunk.index ?? 0;
                const name = chunk.name ?? 'tool';

                if (!toolIndexMap.has(idx)) {
                  const entry = toolCallEntry(name);
                  toolIndexMap.set(idx, entry);
                  updated.push(entry);
                }

                if (chunk.args) {
                  const accumulated = (toolArgsMap.get(`i:${idx}`) ?? '') + chunk.args;
                  toolArgsMap.set(`i:${idx}`, accumulated);

                  const entry = toolIndexMap.get(idx);
                  if (entry) {
                    entry.argsRaw = accumulated;
                    const parsed = parseArgs(accumulated);
                    if (parsed) entry.args = parsed;
                  }
                }
              }
              return updated;
            });
          }
        } else if (event.eventType === 'TOOL_CALL_RESULT') {
          const toolMessage = (event.eventData as Record<string, unknown>).toolMessage as string ?? '';

          setEntries(prev => {
            const updated = [...prev];
            const pendingUI = findLastPendingUIToolCall(updated);
            if (pendingUI) {
              const idx = updated.indexOf(pendingUI);
              updated[idx] = { ...pendingUI, status: 'complete', result: toolMessage || undefined };
              return updated;
            }
            const lastTool = findLastToolCall(updated);
            if (lastTool) {
              lastTool.status = 'complete';
              if (toolMessage) lastTool.result = toolMessage;
            }
            return updated;
          });
        } else if (event.eventType === 'CUSTOM' && event.customEventName === 'EXTERNAL_TOOL_CALL') {
          const data = event.eventData as Record<string, unknown>;
          const toolName = data.toolName as string;
          const toolId = data.toolId as string;
          const toolArgs = data.toolArgs as Record<string, unknown>;

          setEntries(prev => [...prev, uiToolCallEntry(toolName, toolId, toolArgs)]);
          return; // Stop consuming — wait for user input
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      throw err;
    } finally {
      abortRef.current = null;
    }
  }, [getToolMetadata]);

  const sendMessage = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setError(null);
    setIsLoading(true);

    setEntries(prev => [...prev, userMsg(trimmed)]);

    try {
      await processEvents({ message: trimmed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setEntries(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
    }
  }, [processEvents]);

  const resumeAgent = useCallback(async (commandResponse: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      await processEvents({ commandResponse });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [processEvents]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    setError(null);
    threadIdRef.current = undefined;
    idCounter = 0;
  }, []);

  return { entries, isLoading, error, sendMessage, stop, clear, resumeAgent };
}


