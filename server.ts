// deno-lint-ignore-file no-explicit-any
import { createInMemoryTestClient, createMCPServer } from "./mcp-helper.ts";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";

const scriptDir = new URL(".", import.meta.url).pathname;
const toolsPath = join(scriptDir, "tools");
const promptsPath = join(scriptDir, "prompts");

async function mergeTools(): Promise<[Tools, ToolHandlerMap<Tools>]> {
  const tools: any[] = [];
  const handlers: any = {};

  for await (const entry of Deno.readDir(toolsPath)) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const module = await import(`${toolsPath}/${entry.name}`);

      if (module.tool && module.handler) {
        tools.push(module.tool);
        handlers[module.tool.name] = module.handler;
      }
    }
  }

  return [tools as Tools, handlers as ToolHandlerMap<Tools>];
}

async function mergePrompts(): Promise<[Prompts, PromptHandlerMap<Prompts>]> {
  const prompts: any[] = [];
  const handlers: any = {};

  for await (const entry of Deno.readDir(promptsPath)) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const module = await import(`${promptsPath}/${entry.name}`);

      if (module.prompt && module.handler) {
        prompts.push(module.prompt);
        handlers[module.prompt.name] = module.handler;
      }
    }
  }

  return [prompts as Prompts, handlers as PromptHandlerMap<Prompts>];
}

// サーバー初期化をmergeToolsの結果を使用するように修正
const [mergedTools, mergedHandlers] = await mergeTools();
const [mergedPrompts, mergedPromptHandlers] = await mergePrompts();

const server = createMCPServer(
  {
    name: "local-server",
    version: "1.0.0",
  },
  mergedTools,
  mergedHandlers,
  mergedPrompts,
  mergedPromptHandlers,
);

await server.connect(new StdioServerTransport());

import { expect } from "jsr:@std/expect@1.0.13/expect";
import { join } from "node:path";

Deno.test("Check if callable.", async () => {
  const client = await createInMemoryTestClient<
    typeof mergedTools,
    typeof mergedPrompts
  >(server);

  // なんでも良いので、存在するツールを呼び出してみる
  const result = await client.callTool("performFourArithmeticOperations", {
    left: 10,
    right: 5,
    operation: "addition",
  });
  expect(result).toEqual(15);

  await Promise.all([client.close(), server.close()]);
});
