import { z } from "npm:zod@3.24.2";
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

export const tool = {
  name: "macos-notify",
  description: "Send a macOS notification",
  inputSchema: z.object({
    message: z.string().describe("message to send").max(100),
    sound: z.enum([
      "Ping",
    ]).optional().default("Ping").describe("sound name"),
  }),
  outputSchema: z.promise(z.string()),
} as const satisfies Tool;

export const handler: ToolHandler<typeof tool> = async (input) => {
  const { message, sound } = input;
  const result = message;
  await $`osascript -e 'display notification "${result}" with title "Notification" sound name "${sound}"'`;
  return "ok";
};
