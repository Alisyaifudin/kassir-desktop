import z from "zod";
import { ZodSchemaError } from "~/lib/effect-error";
import WebSocket from "@tauri-apps/plugin-websocket";
import { pull, pullSchema } from "./pull";
import { push } from "./push";
import { cleanup } from "./state";

const pushSchema = z.object({
  phase: z.literal("push"),
});

const messageSchema = z.union([pullSchema, pushSchema]);

// ── public API ─────────────────────────────────────────────────────
export const customer = {
  listener,
  cleanup,
};

function listener(data: unknown, ws: WebSocket) {
  const parsed = z.safeParse(messageSchema, data);
  if (!parsed.success) return ZodSchemaError.fail(parsed.error);

  switch (parsed.data.phase) {
    case "pull":
      return pull(parsed.data, ws);
    case "push":
      push(ws);
      break;
  }
}
