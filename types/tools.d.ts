import { z } from "npm:zod@3.24.2";

declare global {
  type ServerInfo = {
    name: string;
    version: string;
  };

  type Tool = {
    name: string;
    description: string;
    inputSchema: z.ZodType;
    outputSchema: z.ZodType;
  };

  type Tools = readonly Tool[];

  type ToolHandlerMap<T extends Tools> = {
    [K in T[number]["name"]]: ToolHandler<T[number]>;
  };

  type ToolHandler<T extends Tool> = (
    params: z.infer<T["inputSchema"]>,
  ) =>
    | z.infer<T["outputSchema"]>
    | Promise<z.infer<T["outputSchema"]>>;

  type InferAvailableTools<T extends Tools> = {
    [K in T[number]["name"]]: {
      input: z.infer<Extract<T[number], { name: K }>["inputSchema"]>;
      output: z.infer<Extract<T[number], { name: K }>["outputSchema"]>;
    };
  };
}
