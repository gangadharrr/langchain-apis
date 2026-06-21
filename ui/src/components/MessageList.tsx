import { useCallback, useEffect, useRef } from 'react';
import type { ConversationEntry, UIToolCallEntry } from '../types';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { useToolContext } from '../contexts/ToolContext';

interface MessageListProps {
  entries: ConversationEntry[];
  isLoading: boolean;
  onToolSubmit: (entry: UIToolCallEntry, result: Record<string, unknown>) => void;
}

export function MessageList({ entries, isLoading, onToolSubmit }: MessageListProps) {
  const { getTool } = useToolContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const lastEntry = entries[entries.length - 1];
  const isLastStreaming = isLoading && lastEntry?.kind === 'assistant';

  const handleToolSubmit = useCallback((entry: UIToolCallEntry, result: Record<string, unknown>) => {
    onToolSubmit(entry, result);
  }, [onToolSubmit]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
            <p className="text-sm text-[var(--muted)] max-w-sm">
              Send a message to start a conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, i) => {
              if (entry.kind === 'user' || entry.kind === 'assistant') {
                return (
                  <div key={entry.id} className="animate-fade-in">
                    <MessageBubble
                      message={entry}
                      isStreaming={entry.kind === 'assistant' && isLastStreaming && i === entries.length - 1}
                    />
                  </div>
                );
              }

              if (entry.kind === 'tool_call') {
                return (
                  <div key={entry.id} className="animate-fade-in">
                    <ToolCallCard tool={entry} />
                  </div>
                );
              }

              if (entry.kind === 'ui_tool_call') {
                return (
                  <div key={entry.id} className="animate-fade-in">
                    <UIToolCallCard
                      entry={entry}
                      onSubmit={(result) => handleToolSubmit(entry, result)}
                      getTool={getTool}
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function UIToolCallCard({
  entry,
  onSubmit,
  getTool,
}: {
  entry: UIToolCallEntry;
  onSubmit: (result: Record<string, unknown>) => void;
  getTool: (name: string) => import('../types').ToolDefinition | undefined;
}) {
  const tool = getTool(entry.name);

  if (!tool) {
    return (
      <div className="p-2 text-xs text-red-500">
        Tool not found: {entry.name}
      </div>
    );
  }

  if (entry.status === 'pending_input' && tool) {
    const RenderComponent = tool.render;
    return (
      <div
        className="rounded-lg border border-[var(--tool-border)] bg-[var(--tool-bg)] overflow-hidden"
        style={{ borderLeft: '3px solid var(--primary)' }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--tool-border)] px-3 py-2">
          <span className="font-mono text-xs font-medium text-[var(--foreground)]">
            {entry.name}
          </span>
          <span className="ml-auto text-xs text-[var(--muted)]">awaiting input…</span>
        </div>
        <div className="p-3">
          <RenderComponent args={entry.args} onSubmit={onSubmit} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-[var(--tool-border)] bg-[var(--tool-bg)] overflow-hidden"
      style={{ borderLeft: '3px solid var(--success)' }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-mono text-xs font-medium text-[var(--foreground)]">
          {entry.name}
        </span>
      </div>
      {entry.result && (
        <div className="border-t border-[var(--tool-border)] px-3 py-2 text-xs text-[var(--foreground)] leading-relaxed">
          {entry.result}
        </div>
      )}
    </div>
  );
}
