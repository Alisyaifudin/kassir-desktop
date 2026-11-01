/**
 * The identifying headers, from the TS side of the seam.
 *
 * What this file can and cannot check is the point of it. The header *values* are
 * assembled in Rust (`src-tauri/src/sync.rs`), so what matters here is:
 *
 *   1. the id we hand over is one the server will actually store — the backend's
 *      `clipToken` (`[A-Za-z0-9._:-]+`, ≤80) drops anything else, and a dropped
 *      id is a NULL `client_request_id` on a log row nobody looks at until an
 *      incident; and
 *   2. every command actually carries it. Forgetting `identify()` in one place
 *      would not fail anything — it would just make that call unattributable,
 *      which is the failure mode this whole phase exists to remove.
 */
import { describe, expect, test, mock } from "bun:test";
import type { Endpoint } from "./transport";

/** Mirrors `clipToken` in kassir-backend/src/logs/record.ts. */
const STORABLE = /^[A-Za-z0-9._:-]{1,80}$/;

/** Records every IPC call instead of talking to Tauri. */
const calls: { name: string; args: Record<string, unknown> }[] = [];

class FakeChannel {
  onmessage: ((raw: string) => void) | null = null;
}

// Must run before `./transport` (and `./stream`) are imported: both pull
// `Channel`/`invoke` out of this module at load time.
mock.module("@tauri-apps/api/core", () => ({
  Channel: FakeChannel,
  invoke: async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    return { protocol: 1, snapshotSeq: 0 };
  },
}));

const { tauriTransport } = await import("./transport");
const { nextRequestId } = await import("./stream");

const endpoint: Endpoint = {
  baseUrl: "https://sync.test",
  token: "kst_test",
  deviceId: "4f1c9e2a-1111-4222-8333-444455556666",
};

function lastCall(): { name: string; args: Record<string, unknown> } {
  const call = calls.at(-1);
  if (call === undefined) throw new Error("no IPC call recorded");
  return call;
}

describe("the per-call request id", () => {
  test("is storable as a header value and as a log column", () => {
    for (const prefix of ["pull", "upload", "health", "session"]) {
      expect(nextRequestId(prefix)).toMatch(STORABLE);
    }
  });

  test("is unique, so two calls cannot share a log row", () => {
    // Date.now() can repeat inside a millisecond; the counter is what saves us.
    const ids = new Set(Array.from({ length: 500 }, () => nextRequestId("pull")));
    expect(ids.size).toBe(500);
  });

  test("says what the call was, which is what makes a log readable", () => {
    expect(nextRequestId("pull")).toStartWith("pull-");
    expect(nextRequestId("upload")).toStartWith("upload-");
  });
});

describe("every sync command identifies the install", () => {
  const simple = [
    ["health", () => tauriTransport.health(endpoint)],
    ["createSession", () => tauriTransport.createSession(endpoint)],
    ["getSession", () => tauriTransport.getSession(endpoint, "ul_1")],
    ["deleteSession", () => tauriTransport.deleteSession(endpoint, "ul_1")],
    ["pull", () => tauriTransport.pull(endpoint, { since: 0, limit: 100 })],
    [
      "uploadChunk",
      () =>
        tauriTransport.uploadChunk(endpoint, {
          uploadId: "ul_1",
          offset: 0,
          prefixSha: "",
          body: "",
          compress: false,
        }),
    ],
  ] as const;

  for (const [name, call] of simple) {
    test(name, async () => {
      calls.length = 0;
      await Promise.resolve(call());
      const { args } = lastCall();
      const client = args["client"] as { deviceId: string; requestId: string };
      expect(client.deviceId).toBe(endpoint.deviceId);
      expect(client.requestId).toMatch(STORABLE);
    });
  }

  test("the request id is also the cancel id", async () => {
    calls.length = 0;
    const stream = tauriTransport.pull(endpoint, { since: 0, limit: 100 });
    const sent = (lastCall().args["client"] as { requestId: string }).requestId;
    stream.cancel();
    // Rust registers the cancel flag under the same id it sent as a header, so
    // the row in the server log names the request that was actually cancelled.
    expect(lastCall().name).toBe("sync_cancel");
    expect(lastCall().args["id"]).toBe(sent);
  });
});
