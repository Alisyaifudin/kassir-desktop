/**
 * The typed transport for the v2 sync commands in `src-tauri/src/sync.rs` and
 * `src-tauri/src/sync_blob.rs`.
 *
 * Two streaming calls, one atomic write and the three image-byte calls — nothing
 * else. There is no session, no upload id, no byte offset and no hash chain in v2
 * (§7.1 "state: none"), so this file is a thin promise wrapper around the IPC
 * commands.
 *
 * The socket lives in Rust because the window CSP (`connect-src 'self' ipc:`)
 * blocks a webview `fetch` to the user-configured sync host. See `sync.rs`.
 */
import { Channel, invoke } from "@tauri-apps/api/core";
import { Context, Layer } from "effect";
import type { SyncHealth, SyncGroup } from ".";
import { nextRequestId, openLineStream, type LineStream } from "./stream";

/** Where the server lives, the bearer token (§5), and who this install is. */
export type Endpoint = {
  baseUrl: string;
  token: string;
  /** Stable per installation, so the server's request log can tell tills apart. */
  deviceId: string;
};

/** A command failure. `code` is the contract's machine-readable code (§16.2). */
export class TransportError extends Error {
  readonly status: number;
  readonly code: string;
  /** Present only on a `410 too_old`: the lowest seq the group still serves. */
  readonly floor?: number;

  constructor(status: number, code: string, message: string, floor?: number) {
    super(message);
    this.name = "TransportError";
    this.status = status;
    this.code = code;
    this.floor = floor;
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
    const candidate = error as { status?: unknown; code?: unknown; message?: unknown; floor?: unknown };
    if (typeof candidate.code === "string") {
      return new TransportError(
        typeof candidate.status === "number" ? candidate.status : 0,
        candidate.code,
        typeof candidate.message === "string" ? candidate.message : candidate.code,
        typeof candidate.floor === "number" ? candidate.floor : undefined,
      );
    }
  }
  return new TransportError(0, "ipc", typeof error === "string" ? error : String(error));
}

/** One generated statement, as the Rust merge command receives it. */
export type MergeStatement = { sql: string; bindings?: (string | number | null)[] };

/**
 * One manifest entry: the bytes the server will serve for one `image_id`.
 *
 * `version` is the `image_updated_at` those bytes were produced for, so the entry
 * only describes the bytes of a row at exactly that clock (§8.7.1).
 */
export type BlobRef = {
  imageId: string;
  version: number;
  sha256: string;
  byteSize: number;
  mime: string;
};

/** One page of `GET /v2/product/image/manifest`, paged by `image_id`. */
export type BlobManifest = {
  blobs: BlobRef[];
  more: boolean;
  /** The `image_id` to continue from; `null` when the page is the last one. */
  next: string | null;
};

/** What `PUT /v2/product/image/blob/:image_id` stored, or already had. */
export type BlobPut = {
  status: number;
  imageId: string;
  version: number;
  /** The digest the server holds for `(imageId, version)` — the local row records it. */
  sha256: string;
  byteSize: number;
  mime: string;
  /** The same bytes were already stored (a retry, or another image shares them). */
  deduped: boolean;
  /** False when a newer clock already owns this image: stored, never served. */
  current: boolean;
};

/** What `GET /v2/blob/:sha256` wrote to disk. */
export type BlobGet = {
  sha256: string;
  byteSize: number;
  mime: string;
};

/** One combo-cover manifest entry: the bytes the server serves for one `combo_id`. */
export type ComboCoverRef = {
  comboId: string;
  version: number;
  sha256: string;
  byteSize: number;
  mime: string;
};

/** One page of `GET /v2/combo/cover/manifest`, paged by `combo_id`. */
export type ComboCoverManifest = {
  blobs: ComboCoverRef[];
  more: boolean;
  /** The `combo_id` to continue from; `null` when the page is the last one. */
  next: string | null;
};

/** What `PUT /v2/combo/cover/blob/:combo_id` stored, or already had. */
export type ComboCoverPut = {
  status: number;
  comboId: string;
  version: number;
  sha256: string;
  byteSize: number;
  mime: string;
  deduped: boolean;
  current: boolean;
};

/** The slice of the Rust sync API the pull/push loops depend on. */
export type SyncTransport = {
  /**
   * `GET /v2/health` — is this token good for this server right now?
   *
   * One plain request rather than a stream: the Cek button wants an answer, not
   * a body to drain, and a health endpoint that streams would be a health
   * endpoint nobody can call from a settings screen.
   */
  health: (endpoint: Endpoint) => Promise<SyncHealth>;
  /** `GET /v2/<group>/pull/:seq?limit=…` — one page of changes, streamed. */
  pull: (
    endpoint: Endpoint,
    input: { group: SyncGroup; after: number; limit: number; count?: boolean },
  ) => LineStream;
  /** `POST /v2/<group>/push` — one NDJSON batch, one ack per frame, streamed. */
  push: (endpoint: Endpoint, input: { group: SyncGroup; body: string }) => LineStream;
  /**
   * `GET /v2/product/one/pull/:product_id` — one snapshot page for the scoped
   * one-product manual sync (`SYNC-V2-ONE-PRODUCT.md` §2). `after` is the opaque
   * `done.cursor` of the previous page, or `null` for the first one.
   */
  productPull: (
    endpoint: Endpoint,
    input: { productId: string; after: string | null; limit: number },
  ) => LineStream;
  /**
   * `POST /v2/product/one/push/:product_id` — a product push whose every frame
   * the server checks against the path scope.
   */
  productPush: (
    endpoint: Endpoint,
    input: { productId: string; body: string },
  ) => LineStream;
  /**
   * Applies a statement batch in one real transaction (`sync_merge` in Rust).
   *
   * `plugin-sql` exposes no transaction handle and runs a multi-statement string
   * in autocommit, so "one transaction per page" (§6.4) needs a connection of
   * its own. See `src-tauri/src/sync_merge.rs`.
   */
  merge: (statements: MergeStatement[]) => Promise<{ statements: number }>;

  // --------------------------------------------------------------------------
  // The image-byte side channel (§2.10, §8.7.1)
  //
  // Three calls that are not frames: no `seq`, no log entry, no bookmark. They
  // live on this type because they use the same base URL, token and identity
  // headers as every other sync call, and because the bytes themselves have to
  // be moved in Rust (the window CSP blocks the sync host — see `sync.rs`).
  // --------------------------------------------------------------------------

  /** `GET /v2/product/image/manifest` — which hash is current for each image. */
  blobManifest: (
    endpoint: Endpoint,
    input: { after: string | null; limit: number; productId?: string },
  ) => Promise<BlobManifest>;
  /**
   * `PUT /v2/product/image/blob/:image_id?version=…` — one image's bytes, read
   * from `AppData/images/<fileName>` and sent as a raw body.
   */
  blobPut: (
    endpoint: Endpoint,
    input: { imageId: string; version: number; fileName: string; mime: string },
  ) => Promise<BlobPut>;
  /**
   * `GET /v2/blob/:sha256` — one image's bytes, written to
   * `AppData/images/<fileName>` and verified against the digest before it lands.
   */
  blobGet: (
    endpoint: Endpoint,
    input: { sha256: string; fileName: string },
  ) => Promise<BlobGet>;

  // --------------------------------------------------------------------------
  // The combo-cover side channel
  //
  // The combo group's twin of the image channel above: the same three routes,
  // under `/v2/combo/cover/`, sharing the same content-addressed download. The
  // combo ROW (with `combo_cover_name`/`combo_cover_mime`) travels in the change
  // log; only the bytes use these calls.
  // --------------------------------------------------------------------------

  /** `GET /v2/combo/cover/manifest` — which hash is current for each combo cover. */
  comboCoverManifest: (
    endpoint: Endpoint,
    input: { after: string | null; limit: number },
  ) => Promise<ComboCoverManifest>;
  /**
   * `PUT /v2/combo/cover/blob/:combo_id?version=…` — one combo's cover bytes,
   * read from `AppData/images/<fileName>` and sent as a raw body.
   */
  comboCoverPut: (
    endpoint: Endpoint,
    input: { comboId: string; version: number; fileName: string; mime: string },
  ) => Promise<ComboCoverPut>;
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
  health(endpoint) {
    return command("sync_health", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      client: identify(endpoint, nextRequestId("health")),
    }).then((report) => report as SyncHealth);
  },
  pull(endpoint, input) {
    return streaming("pull", (requestId, channel) =>
      command("sync_pull", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        group: input.group,
        after: input.after,
        limit: input.limit,
        // `?count=1` sizes the pull (`meta.count`); the first page of a sequence
        // is the only one that asks, because the server has to count the range.
        count: input.count === true,
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
        group: input.group,
        body: input.body,
        client: identify(endpoint, requestId),
      }),
    );
  },
  productPull(endpoint, input) {
    return streaming("product-pull", (requestId, channel) =>
      command("sync_product_pull", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        productId: input.productId,
        after: input.after,
        limit: input.limit,
        client: identify(endpoint, requestId),
      }),
    );
  },
  productPush(endpoint, input) {
    return streaming("product-push", (requestId, channel) =>
      command("sync_product_push", {
        channel,
        baseUrl: endpoint.baseUrl,
        token: endpoint.token,
        productId: input.productId,
        body: input.body,
        client: identify(endpoint, requestId),
      }),
    );
  },
  merge(statements) {
    return command("sync_merge", { plan: { statements } });
  },
  blobManifest(endpoint, input) {
    return command("sync_blob_manifest", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      after: input.after,
      limit: input.limit,
      productId: input.productId,
      client: identify(endpoint, nextRequestId("blob-manifest")),
    });
  },
  blobPut(endpoint, input) {
    return command("sync_blob_put", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      imageId: input.imageId,
      version: input.version,
      fileName: input.fileName,
      mime: input.mime,
      client: identify(endpoint, nextRequestId("blob-put")),
    });
  },
  blobGet(endpoint, input) {
    return command("sync_blob_get", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      sha256: input.sha256,
      fileName: input.fileName,
      client: identify(endpoint, nextRequestId("blob-get")),
    });
  },
  comboCoverManifest(endpoint, input) {
    return command("sync_combo_cover_manifest", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      after: input.after,
      limit: input.limit,
      client: identify(endpoint, nextRequestId("combo-cover-manifest")),
    });
  },
  comboCoverPut(endpoint, input) {
    return command("sync_combo_cover_put", {
      baseUrl: endpoint.baseUrl,
      token: endpoint.token,
      comboId: input.comboId,
      version: input.version,
      fileName: input.fileName,
      mime: input.mime,
      client: identify(endpoint, nextRequestId("combo-cover-put")),
    });
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
