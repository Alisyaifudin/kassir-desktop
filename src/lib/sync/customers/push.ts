import WebSocket from "@tauri-apps/plugin-websocket";
import { pushState } from "./state";

/** Chunk size in bytes for streaming push data. */
export const CHUNK_SIZE = 1024;


/**
 * Send the next chunk of `pushedData` over the WebSocket.
 * Advances `pushCursor` and signals "completed" when all data has been sent.
 */
export function push(ws: WebSocket) {
  const { pushedData, pushCursor } = pushState;
  const chunk = pushedData.slice(pushCursor, pushCursor + CHUNK_SIZE);
  pushState.pushCursor += chunk.length;

  ws.send(
    JSON.stringify({
      type: "customer",
      data: {
        phase: "push",
        status: pushState.pushCursor >= pushedData.length ? "completed" : "progress",
        data: chunk,
      },
    }),
  );
}
