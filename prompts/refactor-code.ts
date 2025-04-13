import { z } from "npm:zod@3.24.2";

export const prompt = {
  name: "refactorCode",
  description: "Refactor code to improve readability and maintainability",
  argumentsSchema: z.object({
    file: z.string().describe("The file to refactor"),
    allowFileSplit: z
      .coerce
      .boolean()
      .optional()
      .describe("Whether to allow file splitting"),
  }),
} as const satisfies Prompt;

export const handler: PromptHandler<typeof prompt> = (input) => {
  return {
    messages: [
      {
        role: "user",
        context: {
          type: "text",
          text: `Refactor the following code:\n\n${input.file}\n \n${
            input.allowFileSplit
              ? "Allow file splitting."
              : "Do not allow file splitting."
          }`,
        },
      },
    ],
  };
};
