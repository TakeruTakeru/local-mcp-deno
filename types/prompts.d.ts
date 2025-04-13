import { z } from "npm:zod@3.24.2";

declare global {
  type Prompt = {
    name: string;
    description: string;
    argumentsSchema: z.ZodType;
  };

  type Prompts = readonly Prompt[];

  type PromptHandlerMap<T extends Prompts> = {
    [K in T[number]["name"]]: PromptHandler<T[number]>;
  };

  type PromptHandler<T extends Prompt> = (
    params: z.infer<T["argumentsSchema"]>,
  ) =>
    | { messages: PromptMessage[] }
    | Promise<{
      messages: PromptMessage[];
    }>;

  type PromptMessage = {
    role: "user" | "assistant";
    // only allow text for now.
    context: {
      "type": "text";
      "text": string;
    };
  };
}

// モジュールとして認識されるために空のexportを追加
export {};
