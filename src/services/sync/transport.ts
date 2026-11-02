/**
 * The typed transport for the v2 sync commands in `src-tauri/src/sync.rs`.
 *
 * Two streaming calls and one atomic write, nothing else. There is no session,
 * no upload id, no byte offset and no hash chain in v2 (§7.1 "state: none"), so
 * this file is a thin promise wrapper around three IPC commands.
 *
 * The socket lives in Rust because the window CSP (`connect-src 'self' ipc:`)
 * blocks a webview `fetch` to the user-configured sync host. See `sync.rs`.
 */
import { Channel, invoke } from "@tauri-apps/api/core";
import { Context, Layer } from "effect";
import { nextRequestId, openLineStream, type LineStream } from "./stream";

/** Where the server lives, the bearer token (§5), and who this install is. */
export type Endpoint = {
  baseUrl: string;
  token: string;
  /** Stable per installation, so the server's request log can tell tills apart. */
  deviceId: string;
};

/** A command failure. `code` is the contract's machine-readable code (§18.2). */
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

/** The slice of the Rust sync API the pull/push loops depend on. */
export type SyncTransport = {
  /** `GET /v2/money/pull/:seq?limit=…` — one page of changes, streamed. */
  pull: (endpoint: Endpoint, input: { after: number; limit: number }) => LineStream;
  /** `POST /v2/money/push` — one NDJSON batch, one ack per frame, streamed. */
  push: (endpoint: Endpoint, input: { body: string }) => LineStream;
  /**
   * Applies a statement batch in one real transaction (`sync_merge` in Rust).
   *
   * `plugin-sql` exposes no transaction handle and runs a multi-statement string
   * in autocommit, so "one transaction per page" (§6.4) needs a connection of
   * its own. See `src-tauri/src/sync_merge.rs`.
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

/** The identifying args every sync command carries, on top of the token. */
function identify(endpoint: Endpoint, requestId: string) {
  return { deviceId: endpoint.deviceId, requestId };
}

function streaming(
  prefix: string,
  start: (
    requestId: string,
    channel: Channel<string>,
  ) => Promise<{
    lines: number;
    cancelled: boolean;
  }>,
): LineStream {
  const requestId = nextRequestId(prefix);
  return openLineStream(requestId, (channel) => start(requestId, channel));
}

/** The real transport: every call is one IPC command. */
export const tauriTransport: SyncTransport = {
  pull(endpoint, input) {
    return streaming("pull", (requestId, channel) =>
      command("sync_pull", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        after: input.after,
        limit: input.limit,
        client: identify(endpoint, requestId),
      }),
    );
  },
  push(endpoint, input) {
    return streaming("push", (requestId, channel) =>
      command("sync_push", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        body: input.body,
        client: identify(endpoint, requestId),
      }),
    );
  },
  merge(statements) {
    return command("sync_merge", { plan: { statements } });
  },
};

/**
 * Drains a line stream through `handle`, returning the command's summary.
 *
 * Both the reader and the summary settle independently: the reader ends on the
 * explicit `end` message Rust sends after the last line, the summary on the
 * command's return value. Reading the summary last means every line has been
 * handled before the caller learns the outcome.
 */
export async function consumeLines(
  stream: LineStream,
  handle: (line: string) => void,
): Promise<void> {
  for await (const line of stream.lines) handle(line);
  try {
    await stream.summary;
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * The transport as a service.
 *
 * Injected rather than imported by `live.ts` so the pull/push loops can be tested
 * against an in-memory server, which is the only way to exercise them without a
 * webview and a network.
 */
export class SyncTransportService extends Context.Tag("SyncTransportService")<
  SyncTransportService,
  SyncTransport
>() {}

export const SyncTransportLive = Layer.succeed(SyncTransportService, tauriTransport);
