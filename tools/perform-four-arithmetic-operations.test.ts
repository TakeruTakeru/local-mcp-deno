import { expect } from "jsr:@std/expect@1.0.13";
import { handler } from "./perform-four-arithmetic-operations.ts";

Deno.test("four arithmetic operations handler - addition", () => {
  const result = handler({
    left: 10,
    right: 5,
    operation: "addition",
  });
  expect(result).toBe(15);
});

Deno.test("four arithmetic operations handler - subtraction", () => {
  const result = handler({
    left: 10,
    right: 5,
    operation: "subtraction",
  });
  expect(result).toBe(5);
});

Deno.test("four arithmetic operations handler - multiplication", () => {
  const result = handler({
    left: 10,
    right: 5,
    operation: "multiplication",
  });
  expect(result).toBe(50);
});

Deno.test("four arithmetic operations handler - division", () => {
  const result = handler({
    left: 10,
    right: 5,
    operation: "division",
  });
  expect(result).toBe(2);
});

Deno.test("four arithmetic operations handler - division by zero", () => {
  expect(() => {
    handler({
      left: 10,
      right: 0,
      operation: "division",
    });
  }).toThrow("Division by zero is not allowed");
});
