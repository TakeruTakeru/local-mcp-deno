// from https://jsr.io/@mizchi/mcp-helper

import { Server } from "npm:@modelcontextprotocol/sdk@1.5.0/server/index.js";
import { Client } from "npm:@modelcontextprotocol/sdk@1.5.0/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/inMemory.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import { z, ZodObjectDef } from "npm:zod@3.24.2";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.24.2";

// Create a type-safe client for testing
export async function createInMemoryTestClient<
  T extends Tools,
  P extends Prompts,
>(
  server: Server,
) {
  const client = new Client(
    {
      name: "test-client",
      version: "1.0",
    },
    {
      capabilities: {},
    },
  );

  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return {
    async callTool<K extends T[number]["name"]>(
      name: K,
      args: InferAvailableTools<T>[K]["input"],
    ): Promise<InferAvailableTools<T>[K]["output"]> {
      const result = await client.callTool({
        name: name,
        arguments: args,
      });

      if (!result || typeof result !== "object") {
        throw new Error("Invalid response format");
      }

      const { isError, content } = result as {
        isError: boolean;
        content?: Array<{ type: string; text: string }>;
      };

      if (isError || !content?.[0]?.text) {
        throw new Error(content?.[0]?.text ?? "Unknown error");
      }

      return JSON.parse(content[0].text);
    },

    async getPrompt<K extends P[number]["name"]>(
      name: K,
      args: z.infer<Extract<P[number], { name: K }>["argumentsSchema"]>,
    ) {
      // const result = await client.getPrompt({
      //   name,
      //   arguments: { ...args },
      // });
      const res = await client.listPrompts();
      console.log(res);
      // if (!result || typeof result !== "object") {
      //   throw new Error("Invalid response format");
      // }

      // return result;
    },

    async close() {
      await client.close();
    },
  };
}

export function createMCPServer<T extends Tools, P extends Prompts>(
  info: ServerInfo,
  tools: T,
  toolHandlers: ToolHandlerMap<T>,
  prompts: P,
  promptHandlers: PromptHandlerMap<P>,
) {
  // Convert tool definitions to MCP Tool format
  const toolList = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema) as {
      type: "object";
      properties: Record<string, unknown>;
    },
  }));

  const promptList = prompts.map((prompt) => ({
    name: prompt.name,
    description: prompt.description,
    arguments: Object.entries(
      (prompt.argumentsSchema._def as ZodObjectDef).shape(),
    ).map((
      [key, value],
    ) => ({
      name: key,
      description: value._def.description || "", // Extract description
      required: !value.isOptional(), // Check if field is optional
    })),
  }));

  const server = new Server(info, {
    capabilities: {
      resources: {},
      tools: Object.fromEntries(toolList.map((tool) => [tool.name, tool])),
      prompts: Object.fromEntries(
        promptList.map((prompt) => [prompt.name, prompt]),
      ),
    },
  });

  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [],
  }));

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: toolList,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments ?? {};
    try {
      const tool = tools.find((t) => t.name === request.params.name);
      if (!tool) {
        throw new Error(`Tool ${request.params.name} not found`);
      }
      const handler = toolHandlers[request.params.name as T[number]["name"]];
      const result = await handler(args);
      const validatedResult = tool.outputSchema.parse(result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(validatedResult),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: (error as Error).message,
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: promptList,
  }));

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const prompt = prompts?.find((p) => p.name === request.params.name);
    if (!prompt) {
      throw new Error(`Prompt ${request.params.name} not found`);
    }
    const handler = promptHandlers[request.params.name as P[number]["name"]];
    const args = prompt.argumentsSchema.parse(request.params.arguments);
    const result = handler(args);

    return result;
  });

  console.error("MCP server running on stdio");
  return server;
}

import { expect } from "jsr:@std/expect@1.0.13";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";

Deno.test(
  "Tool definition",
  {
    sanitizeOps: false,
  },
  async () => {
    const tools = [
      {
        name: "getStringLength",
        description: "Get length of input string",
        inputSchema: z.object({
          input: z.string().describe("The input string"),
        }),
        outputSchema: z.number(),
      },
    ] as const satisfies Tools;

    const prompts = [
      {
        name: "selfIntroduction",
        description: "introduce yourself",
        argumentsSchema: z.object({
          name: z.string().describe("Your name"),
        }),
      },
    ] as const satisfies Prompts;

    const server = createMCPServer(
      {
        name: "test-server",
        version: "1.0.0",
      },
      tools,
      {
        getStringLength(params) {
          return params.input.length;
        },
      },
      prompts,
      {
        selfIntroduction(params) {
          return {
            messages: [
              {
                role: "user",
                context: {
                  type: "text",
                  text: `your name is ${params.name}. do self introduction.`,
                },
              },
            ],
          };
        },
      },
    );
    await server.connect(new StdioServerTransport());

    const client = await createInMemoryTestClient<typeof tools, typeof prompts>(
      server,
    );
    const result = await client.callTool("getStringLength", {
      input: "Hello, world!",
    });

    expect(result).toBe(13);

    await client.getPrompt("selfIntroduction", {
      name: "John Doe",
    });

    // const promptResult = await client.getPrompt("selfIntroduction", {
    //   name: "John Doe",
    // });
    // expect(promptResult);

    await Promise.all([client.close(), server.close()]);
  },
);
