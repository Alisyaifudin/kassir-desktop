/**
 * Failure evidence: what only this device can see (phase 4 of the request log).
 *
 * The server's log row for a broken response says it answered `200`, because it
 * did — workerd re-encoded the body after `new Response(...)` returned. So the
 * client's half is not a nicety: it is the only record that the bytes arrived
 * wrong. These tests pin the three links that carry it:
 *
 *   Rust `Head` event  →  `LineStream.head`  →  `SyncError.evidence`  →  report
 */
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { FrameError } from "./frames";
import { SyncError } from ".";
import { toSyncError, withHead } from "./pull";
import { TransportError } from "./transport";
import type { LineStream } from "./stream";

/** A stream that never yields; only its id and head matter here. */
function stream(head: { hex: string; bytes: number } | null, requestId = "pull-abc-1"): LineStream {
  return {
    requestId,
    head,
    lines: (async function* () {
      // nothing to read
    })(),
    summary: Promise.resolve({ lines: 0, cancelled: false }),
    cancel: () => undefined,
  };
}

const GZIP_HEAD = { hex: "1f8b0800", bytes: 1417 };

describe("withHead", () => {
  test("puts the received bytes in the sentence the user reads", () => {
    // A cashier can read this off the screen and paste it. That is faster than any
    // log query, and this is the exact number that named the original failure.
    expect(withHead("Baris NDJSON dari server tidak dapat dibaca", GZIP_HEAD)).toBe(
      "Baris NDJSON dari server tidak dapat dibaca (awal data: 1f8b0800, 1417 byte)",
    );
  });

  test("leaves the message alone when nothing arrived", () => {
    expect(withHead("boom", null)).toBe("boom");
  });

  test("an empty head still says how much arrived", () => {
    expect(withHead("boom", { hex: "", bytes: 0 })).toBe("boom (awal data: kosong, 0 byte)");
  });
});

describe("toSyncError", () => {
  test("a parse failure carries the route, the request id and the bytes", () => {
    const error = toSyncError(new FrameError("Baris NDJSON dari server tidak dapat dibaca"), stream(GZIP_HEAD));

    expect(error.stage).toBe("parse");
    expect(error.evidence).toEqual({
      requestId: "pull-abc-1",
      route: "/v1/pull",
      firstBytesHex: "1f8b0800",
      bytes: 1417,
    });
    // The message the screen renders names the wire, not just the symptom.
    expect(error.message).toContain("1f8b0800");
  });

  test("an upload failure is reported against the upload route", () => {
    const error = toSyncError(
      new FrameError("ack tidak dikenali"),
      stream(null, "upload-abc-2"),
      "/v1/upload/:id",
    );
    expect(error.evidence?.route).toBe("/v1/upload/:id");
    expect(error.evidence?.firstBytesHex).toBeNull();
  });

  test("a transport failure is a stream failure, not a parse failure", () => {
    // Different investigations: parse means the bytes were never JSON, stream
    // means the request itself died.
    const error = toSyncError(new TransportError(502, "http_error", "Server membalas 502"));
    expect(error.stage).toBe("stream");
    expect(error.code).toBe("http_error");
    // Nothing was received, so there is nothing to report.
    expect(error.evidence).toBeUndefined();
  });

  test("a failure with no request behind it is not reported at all", () => {
    // A bad config or a failed merge has no wire evidence; reporting it would be
    // noise in the server's log.
    const error = toSyncError(new Error("Alamat server belum diisi"));
    expect(error.evidence).toBeUndefined();
    expect(error.stage).toBeUndefined();
  });

  test("an already-mapped error is passed through untouched", () => {
    const original = new SyncError({ message: "x", stage: "apply" });
    expect(toSyncError(original, stream(GZIP_HEAD))).toBe(original);
  });
});

describe("the report the service sends", () => {
  test("names the request, the route, the stage and the bytes", () => {
    // This is the shape `POST /v1/diagnostics` accepts; the server whitelists
    // `stage` and `route` and joins on `client_request_id`.
    const error = toSyncError(new FrameError("unreadable"), stream(GZIP_HEAD));
    const report = Effect.runSync(
      Effect.succeed({
        clientRequestId: error.evidence!.requestId,
        stage: error.stage!,
        route: error.evidence!.route,
        message: error.message,
        firstBytesHex: error.evidence!.firstBytesHex,
        bytes: error.evidence!.bytes,
      }),
    );
    expect(report).toEqual({
      clientRequestId: "pull-abc-1",
      stage: "parse",
      route: "/v1/pull",
      message: "unreadable (awal data: 1f8b0800, 1417 byte)",
      firstBytesHex: "1f8b0800",
      bytes: 1417,
    });
  });
});
