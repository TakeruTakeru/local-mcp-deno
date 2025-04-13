import { z } from "npm:zod@3.24.2";

export const tool = {
  name: "performFourArithmeticOperations",
  description: "Perform four arithmetic operations",
  inputSchema: z.object({
    left: z.number().describe("left term"),
    right: z.number().describe("right term"),
    operation: z
      .enum(["addition", "subtraction", "multiplication", "division"])
      .describe("operation"),
  }),
  outputSchema: z.number().describe("result"),
} as const satisfies Tool;

export const handler: ToolHandler<typeof tool> = (input) => {
  const { left, right, operation } = input;
  let result: number;
  switch (operation) {
    case "addition":
      result = left + right;
      break;
    case "subtraction":
      result = left - right;
      break;
    case "multiplication":
      result = left * right;
      break;
    case "division":
      if (right === 0) {
        throw new Error("Division by zero is not allowed");
      }
      result = left / right;
      break;
  }
  return result;
};
