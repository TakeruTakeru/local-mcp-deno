import { handler } from "./macos-notify.ts";

Deno.test("通知", async () => {
  const result = handler({
    message: "Hello, World!",
    sound: "Ping",
  });
  await result;
});
