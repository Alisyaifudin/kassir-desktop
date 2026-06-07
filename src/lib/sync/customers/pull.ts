import { Effect } from "effect";
import z from "zod";
import { db } from "~/database/db";
import WebSocket from "@tauri-apps/plugin-websocket";
import { textUtil } from "~/lib/text-binary";
import { merge } from "./merge";
import { push } from "./push";
import { pulledData, pushState } from "./state";

export const pullSchema = z.object({
  phase: z.literal("pull"),
  status: z.enum(["progress", "completed"]),
  data: z.number().array(),
});

type PullMessage = z.infer<typeof pullSchema>;

/**
 * Handle an incoming pull message from the server.
 *
 * - **progress**: accumulate chunked bytes, acknowledge receipt.
 * - **completed**: accumulate final chunk, merge into local DB,
 *   encode unsynced local customers, then start the push stream.
 */
export function pull(msg: PullMessage, ws: WebSocket) {
  return Effect.gen(function* () {
    pulledData.push(...msg.data);

    if (msg.status === "progress") {
      ws.send(JSON.stringify({ type: "pull", status: "progress" }));
      return;
    }

    // completed — merge server data, then push local changes back
    yield* merge(pulledData);

    const lastSyncAt = yield* db.customer.get.lastSyncAt();
    const customers = yield* db.customer.get.unsync.after(lastSyncAt);

    pushState.pushedData = yield* textUtil.encode(JSON.stringify(customers));
    pushState.pushCursor = 0;
    push(ws);
  });
}
