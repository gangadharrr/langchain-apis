import { useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useToolContext } from '../contexts/ToolContext';
import { AskQuestionTool } from './tools/ask-question/ask-question-tool';
import type { UIToolCallEntry } from '../types';

export function ChatContainer() {
  const { getToolMetadata, getTool } = useToolContext();
  const { entries, isLoading, error, sendMessage, stop, resumeAgent } = useChat(getToolMetadata);

  const handleToolSubmit = useCallback((entry: UIToolCallEntry, result: Record<string, unknown>) => {
    const tool = getTool(entry.name);
    if (!tool) return;
    const commandResponse = tool.handle(entry.args, result);
    resumeAgent(commandResponse);
  }, [getTool, resumeAgent]);

  return (
    <div className="flex h-screen flex-col bg-[var(--page)]">
      <AskQuestionTool />
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--page)]">
        <div className="mx-auto flex h-12 max-w-3xl items-center px-4" />
      </header>

      {error && (
        <div className="shrink-0 border-b border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-2">
          <p className="mx-auto max-w-3xl text-sm text-[var(--error-text)]">{error}</p>
        </div>
      )}

      <MessageList entries={entries} isLoading={isLoading} onToolSubmit={handleToolSubmit} />

      <ChatInput onSend={sendMessage} onStop={stop} isLoading={isLoading} />
    </div>
  );
}
