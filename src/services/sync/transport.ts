/**
 * The typed transport for the sync commands in `src-tauri/src/sync.rs`.
 *
 * Every call here is a promise (or a `LineStream`), not an Effect: the transport
 * is the dumb edge. The Effect wrapper, progress reporting and retry policy live
 * in `push.ts`/`pull.ts` so they can be tested against a fake transport without
 * a webview or a network.
 */
import { Channel, invoke } from "@tauri-apps/api/core";
import { Context, Layer } from "effect";
import { nextRequestId, openLineStream, type LineStream, type StreamSummary } from "./stream";

/** Where the server lives, the bearer token (§10), and who this install is. */
export type Endpoint = {
  baseUrl: string;
  token: string;
  /**
   * Stable per installation — a UUID persisted in the store (`sync.device_id`).
   *
   * Without it the server log can only attribute a request to the *token*, and
   * every till sharing one token looks identical. That is what made the
   * gzip-of-gzip failure impossible to pin to a device or a build; the backend
   * records this in `logs.device_id` (kassir-backend/docs/LOGS.md).
   */
  deviceId: string;
};

/** A sync session's server-side pointer (§7.1). */
export type Session = { uploadId: string; at: number; frames: number };

/** The chain hash after a sequence of lines, and their byte count (§7.3). */
export type ChainState = { chain: string; bytes: number };

/** A command failure. `code` is the contract's error code (§11). */
export class TransportError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "TransportError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Normalises whatever the IPC rejected with.
 *
 * `#[tauri::command]` serialises our `SyncFailure` error value as-is, so the
 * documented case arrives as an object. Anything else (the command panicked, the
 * webview was reloaded mid-call) arrives as a string, and a code of `ipc` keeps
 * that distinguishable from a server answer.
 */
function normalizeError(error: unknown): TransportError {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { status?: unknown; code?: unknown; message?: unknown };
    if (typeof candidate.code === "string") {
      return new TransportError(
        typeof candidate.status === "number" ? candidate.status : 0,
        candidate.code,
        typeof candidate.message === "string" ? candidate.message : candidate.code,
      );
    }
  }
  return new TransportError(0, "ipc", typeof error === "string" ? error : String(error));
}

/** One generated statement, as the Rust merge command receives it. */
export type MergeStatement = { sql: string; bindings?: (string | number | null)[] };

/** The slice of the Rust sync API the push/pull loops depend on. */
export type SyncTransport = {
  health: (endpoint: Endpoint) => Promise<{ protocol: number; snapshotSeq: number }>;
  createSession: (endpoint: Endpoint) => Promise<Session>;
  getSession: (endpoint: Endpoint, uploadId: string) => Promise<Session>;
  deleteSession: (endpoint: Endpoint, uploadId: string) => Promise<void>;
  pull: (endpoint: Endpoint, input: { since: number; limit: number }) => LineStream;
  uploadChunk: (
    endpoint: Endpoint,
    input: {
      uploadId: string;
      offset: number;
      prefixSha: string;
      /** Canonical NDJSON text, newline-terminated. */
      body: string;
      compress: boolean;
    },
  ) => LineStream;
  chain: (prev: string, lines: string[]) => Promise<ChainState>;
  /**
   * Applies a merge in one real transaction (`sync_merge` in Rust).
   *
   * This is the one call that is not a `plugin-sql` statement: the plugin keeps
   * its pool private and runs a multi-statement string in autocommit, so "the whole
   * pull is one commit" needs a connection of its own. See `src-tauri/src/sync_merge.rs`.
   */
  merge: (statements: MergeStatement[]) => Promise<{ statements: number }>;
};

async function command<T>(name: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(name, args);
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * The identifying args every sync command carries.
 *
 * `requestId` is generated per call and travels as `X-Kassir-Request-Id`, so the
 * server's log row and any failure report from this device can be joined on it.
 * The app version is not sent from here — Rust reads it from the binary, which is
 * the only authority on which build is running.
 */
function identify(endpoint: Endpoint, requestId: string) {
  return { deviceId: endpoint.deviceId, requestId };
}

function streaming(
  prefix: string,
  start: (requestId: string, channel: Channel<string>) => Promise<StreamSummary>,
): LineStream {
  const requestId = nextRequestId(prefix);
  return openLineStream(requestId, (channel) => start(requestId, channel));
}

/** The real transport: every call is one IPC command. */
export const tauriTransport: SyncTransport = {
  health(endpoint) {
    return command("sync_health", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      client: identify(endpoint, nextRequestId("health")),
    });
  },
  createSession(endpoint) {
    return command("sync_create_session", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      client: identify(endpoint, nextRequestId("session")),
    });
  },
  getSession(endpoint, uploadId) {
    return command("sync_get_session", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      uploadId,
      client: identify(endpoint, nextRequestId("session")),
    });
  },
  deleteSession(endpoint, uploadId) {
    return command("sync_delete_session", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      uploadId,
      client: identify(endpoint, nextRequestId("session")),
    });
  },
  pull(endpoint, input) {
    return streaming("pull", (requestId, channel) =>
      command("sync_pull", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        since: input.since,
        limit: input.limit,
        client: identify(endpoint, requestId),
      }),
    );
  },
  uploadChunk(endpoint, input) {
    return streaming("upload", (requestId, channel) =>
      command("sync_upload_chunk", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        uploadId: input.uploadId,
        offset: input.offset,
        prefixSha: input.prefixSha,
        body: input.body,
        compress: input.compress,
        client: identify(endpoint, requestId),
      }),
    );
  },
  chain(prev, lines) {
    return command("sync_chain", { prev, lines });
  },
  merge(statements) {
    return command("sync_merge", { plan: { statements } });
  },
};

/**
 * Drains a line stream through `handle`, returning the command's summary.
 *
 * Errors are rethrown as `TransportError` so callers only handle one failure
 * type. A `cancel` closure is exposed through `onStreamOpen` so an Effect
 * finalizer can stop the request when the fiber is interrupted.
 */
export async function consumeLines(
  stream: LineStream,
  handle: (line: string) => void | Promise<void>,
): Promise<StreamSummary> {
  // Both the reader and the summary settle independently: the reader ends on the
  // explicit `end` message, the summary on the command's return value. Reading
  // the summary last (after the reader drains) means every line has been handled
  // before the caller learns the outcome.
  for await (const line of stream.lines) {
    await handle(line);
  }
  try {
    return await stream.summary;
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * The transport as a service.
 *
 * Injected rather than imported by `live.ts` for one reason: the push and pull
 * loops are the part of sync that must be provably correct, and they can only be
 * exercised against a server that streams NDJSON — which the bun tests do with an
 * in-memory fake. Everything else in the app gets `SyncTransportLive`.
 */
export class SyncTransportService extends Context.Tag("SyncTransportService")<
  SyncTransportService,
  SyncTransport
>() {}

export const SyncTransportLive = Layer.succeed(SyncTransportService, tauriTransport);
