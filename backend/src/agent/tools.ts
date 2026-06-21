import { ContentAndArtifact, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createZodSchema } from "../utils/zod.util";

export abstract class BaseLangChainTool extends StructuredTool<unknown> {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodTypeAny;
  abstract isExternal?: boolean;

    
  async _call(input: unknown): Promise<ContentAndArtifact | string> {
    throw new Error("Method not implemented.");
  }
}

export class RandomNumberTool extends BaseLangChainTool {
  name = "random_number";
  description = "Generates a random number between 0 and 1.";
  schema = z.object({});
  isExternal = false;
  async _call(args: z.infer<typeof this.schema>): Promise<ContentAndArtifact | string> {
    const randomNumber = Math.random();
    return `Random number: ${randomNumber}`
  }
}

export class UIProxyTool extends BaseLangChainTool {
    name: string;
    description: string;
    schema: z.ZodTypeAny;
    isExternal = true;
    constructor(name: string, description: string, schema: Record<string, unknown>) {
        super();
        this.name = name;
        this.description = description;
        this.schema = createZodSchema(schema);
    }
    async _call(args: unknown): Promise<ContentAndArtifact | string> {
        return Promise.resolve("This is a placeholder result from the UIProxyTool.");
    }
}