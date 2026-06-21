import { Interrupt, ReactAgent } from "langchain";
import {
  AIMessage,
  AIMessageChunk,
  ContentBlock,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { env } from "../config/env";
import logger from "../config/logger";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";
import { Command, Messages } from "@langchain/langgraph";
import { EventType } from "@ag-ui/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvokeAgentOptions {
  /** Conversation thread id — reuse the same id to maintain history. */
  threadId?: string;
  commandResponse?: Record<string, unknown>;
}

export interface AgentEvent {
  eventType: EventType;
  customEventName?: string;
  eventData: Record<string, unknown> | string;
}

export interface AgentResponse {
  answer: string;
  threadId: string;
}

// ── Agent ─────────────────────────────────────────────────────────────────────
// createAgent (langchain/agents) — LangChain v1 high-level API.
//
// WHY string model instead of ChatOpenAI instance:
//   pnpm creates two physical copies of @langchain/core — one nested under
//   langchain's virtual store, one under @langchain/openai's. TypeScript sees
//   them as unrelated types even though they are identical at runtime. Passing
//   model as a string lets createAgent instantiate ChatOpenAI from its own copy,
//   eliminating the duplicate-module type clash entirely.
//
// Custom baseURL (OpenRouter / Ollama) is applied via the OPENAI_BASE_URL env var
// which @langchain/openai respects automatically via OPENAI_BASE_URL when the
// string model identifier is used ("openai:<model>").

export function createChatModel({
  temperature = 0.7,
  timeoutMs = 60_000,
  extraModelKwargs = {},
  maxTokens = -1,
}: {
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  extraModelKwargs?: Record<string, unknown>;
} = {}): BaseChatModel {
  return new ChatOpenAI({
    modelName: env.OPENAI_MODEL,
    apiKey: env.OPENAI_API_KEY,
    configuration: { baseURL: env.OPENAI_BASE_URL },
    temperature,
    streaming: true,
    streamUsage: true,
    maxTokens,
    timeout: timeoutMs,
    modelKwargs: extraModelKwargs,
  });
}

logger.info(
  {
    model: env.OPENAI_MODEL,
    baseURL: env.OPENAI_BASE_URL ?? "(openai default)",
  },
  "LangChain agent ready",
);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Stream the agent's response token-by-token via streamEvents.
 * Yields each text chunk as it arrives from the LLM.
 */
function extractTextFromContentBlocks(
  contentBlocks: Array<ContentBlock>,
): string {
  let text = "";
  for (const block of contentBlocks) {
    if (block.type === "text") {
      text += String(block.text);
    }
  }
  return text;
}

export async function* streamAgent(
  agent: ReactAgent,
  message?: string,
  { threadId = randomUUID(), commandResponse }: InvokeAgentOptions = {},
): AsyncGenerator<AgentEvent> {
  let messageState: { messages: Messages } | Command;
  if (commandResponse) {
    messageState = new Command({
      resume: commandResponse,
    });
  } else if (message) {
    messageState = { messages: [new HumanMessage(message)] };
  } else {
    throw new Error("Either message or commandResponse must be provided");
  }

  const eventStream = await agent.stream(messageState, {
    streamMode: ["updates", "messages"],
    configurable: { thread_id: threadId },
  });

  yield {
    eventType: EventType.RUN_STARTED,
    eventData: { threadId },
  };
  for await (const [mode, chunk] of eventStream) {
    if (mode === "updates") {
      if ("__interrupt__" in chunk && Array.isArray(chunk.__interrupt__)) {
        for (const interruptChunk of chunk.__interrupt__ as Interrupt<AgentEvent>[]) {
          yield interruptChunk.value as AgentEvent;
        }
      } else if ("model_request" in chunk) {
        for (const message of chunk.model_request.messages) {
          yield {
            eventType: EventType.TEXT_MESSAGE_END,
            eventData: {},
          };
        }
      }
    } else if (mode === "messages") {
      const message = chunk[0];
      if (AIMessageChunk.isInstance(message)) {
        let eventType: EventType;
        let eventData = {};
        if (message.tool_call_chunks?.length > 0) {
          eventType = EventType.TOOL_CALL_ARGS;
          eventData = {
            aiMessage: extractTextFromContentBlocks(message.contentBlocks),
            toolCallChunks: message.tool_call_chunks,
          };
        } else {
          eventType = EventType.TEXT_MESSAGE_CONTENT;
          eventData = {
            aiMessage: extractTextFromContentBlocks(message.contentBlocks),
          };
        }
        yield {
          eventType: eventType,
          eventData: eventData,
        };
      } else if (ToolMessage.isInstance(message)) {
        yield {
          eventType: EventType.TOOL_CALL_RESULT,
          eventData: {
            toolMessage: extractTextFromContentBlocks(message.contentBlocks),
          },
        };
      }
    }
  }
  yield {
    eventType: EventType.RUN_FINISHED,
    eventData: "",
  };
}
