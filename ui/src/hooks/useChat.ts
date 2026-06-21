import { useState, useRef, useCallback } from 'react';
import type {
  ConversationEntry,
  UserMessage,
  AssistantMessage,
  ToolCallEntry,
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
    last.content = clean;
    if (thinking !== undefined) last.thinking = thinking;
    return last;
  }
  const raw = text;
  const { clean, thinking } = extractThinking(raw);
  const msg = assistantMsg(clean);
  if (thinking !== undefined) msg.thinking = thinking;
  entries.push(msg);
  return msg;
}

export function useChat() {
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setError(null);
    setIsLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let turnEntries: ConversationEntry[] = [];
    setEntries(prev => {
      turnEntries = [...prev, userMsg(trimmed)];
      return turnEntries;
    });

    const toolArgsMap = new Map<string, string>();
    const toolIndexMap = new Map<number, ToolCallEntry>();

    try {
      for await (const event of streamChat(
        { message: trimmed, threadId: threadIdRef.current },
        abortController.signal,
      )) {
        if (event.eventType === 'RUN_STARTED') {
          const data = event.eventData as Record<string, unknown>;
          if (data.threadId) threadIdRef.current = data.threadId as string;
        }

        if (event.eventType === 'TEXT_MESSAGE_START' || event.eventType === 'TEXT_MESSAGE_CONTENT') {
          const text = (event.eventData as Record<string, unknown>).aiMessage as string ?? '';
          if (!text) continue;
          appendAIText(turnEntries, text);
          setEntries([...turnEntries]);
        }

        if (event.eventType === 'TOOL_CALL_ARGS') {
          const data = event.eventData as Record<string, unknown>;
          const text = data.aiMessage as string ?? '';

          if (text) appendAIText(turnEntries, text);

          const chunks = data.toolCallChunks as
            | Array<{ name?: string; id?: string; args?: string; index?: number }>
            | undefined;

          if (chunks) {
            for (const chunk of chunks) {
              const idx = chunk.index ?? 0;
              const name = chunk.name ?? 'tool';

              if (!toolIndexMap.has(idx)) {
                const entry = toolCallEntry(name);
                toolIndexMap.set(idx, entry);
                turnEntries.push(entry);
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
          }
          setEntries([...turnEntries]);
        }

        if (event.eventType === 'TOOL_CALL_RESULT') {
          const toolMessage = (event.eventData as Record<string, unknown>).toolMessage as string ?? '';

          const lastTool = findLastToolCall(turnEntries);
          if (lastTool) {
            lastTool.status = 'complete';
            if (toolMessage) lastTool.result = toolMessage;
          }
          setEntries([...turnEntries]);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setEntries(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    setError(null);
    threadIdRef.current = undefined;
    idCounter = 0;
  }, []);

  return { entries, isLoading, error, sendMessage, stop, clear };
}

function findLastToolCall(arr: ConversationEntry[]): ToolCallEntry | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].kind === 'tool_call') return arr[i] as ToolCallEntry;
  }
  return undefined;
}


