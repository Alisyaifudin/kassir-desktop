/**
 * The web Streams API, polyfilled over a Tauri IPC channel.
 *
 * ## Why a polyfill exists at all
 *
 * The sync contract is written against `ReadableStream`: the pull response is a
 * stream of NDJSON lines that must be consumed *while it arrives* (a full-history
 * pull is hundreds of pages; buffering one page is fine, buffering a run is not),
 * and the upload response is an ack stream for the same reason. The webview
 * cannot do this the way the contract describes:
 *
 *   * `fetch` is governed by the window CSP (`connect-src 'self' ipc:`), so a
 *     request to the configured sync host never leaves the process; and
 *   * a streaming request body is not reliably implemented on the WebViews we
 *     ship on.
 *
 * `src-tauri/src/sync.rs` therefore owns the socket: it reads the response body
 * chunk by chunk, cuts it into lines, and pushes one line per message on a
 * `tauri::ipc::Channel`. This module turns that channel back into the thing the
 * rest of the sync code is written against — an async iterable of lines with a
 * `cancel` — so `pull.ts`/`push.ts` read like ordinary stream consumers.
 *
 * ## Ordering
 *
 * Channel messages are delivered out of band from the command's return value, so
 * "the command resolved" does not mean "every message arrived". The Rust side
 * therefore sends an explicit `{"type":"end"}` after the last line, and the
 * reader closes on that message. A rejected command closes the reader too: the
 * Rust side sends nothing after a failure.
 */
import { Channel, invoke } from "@tauri-apps/api/core";

/** One complete NDJSON line (no terminating newline). */
export type LineStreamEvent = { type: "line"; line: string } | { type: "end" };

/** What a streaming command reports once its response body is consumed. */
export type StreamSummary = { lines: number; cancelled: boolean };

/** A `ReadableStream`-shaped reader over one command invocation. */
export type LineStream = {
  /** Iterate lines as they arrive. Ends when the Rust side sends `end`. */
  readonly lines: AsyncIterable<string>;
  /** Resolves when the command returns; rejects with the command's error. */
  readonly summary: Promise<StreamSummary>;
  /** Stops the underlying request (fire-and-forget `sync_cancel`). */
  cancel: () => void;
};

type Waiter = (result: IteratorResult<string>) => void;

/**
 * The queue behind the reader: `push` from the channel callback, `read` from the
 * consumer. Bounded by nothing — a pull page is at most `limit` lines and the
 * consumer is faster than the network, but a runaway producer would grow this,
 * so the Rust side is the only producer and it respects backpressure by
 * awaiting each `channel.send`.
 */
class LineQueue implements AsyncIterable<string> {
  private readonly items: string[] = [];
  private readonly waiters: Waiter[] = [];
  private closed = false;

  push(item: string): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter === undefined) this.items.push(item);
    else waiter({ value: item, done: false });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  read(): Promise<IteratorResult<string>> {
    const item = this.items.shift();
    if (item !== undefined) return Promise.resolve({ value: item, done: false });
    if (this.closed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  [Symbol.asyncIterator](): AsyncIterator<string> {
    return { next: () => this.read() };
  }
}

let requestCounter = 0;

/** A unique id for `sync_cancel`; only needs to be unique within the session. */
export function nextRequestId(prefix: string): string {
  requestCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${requestCounter}`;
}

/**
 * Opens a line stream for one command.
 *
 * `start` receives the channel and the request id and must return the command's
 * promise. The command must be one of the Rust streaming commands, which send
 * `{"type":"line"}` messages followed by `{"type":"end"}`.
 */
export function openLineStream(
  requestId: string,
  start: (channel: Channel<string>) => Promise<StreamSummary>,
): LineStream {
  const queue = new LineQueue();
  const channel = new Channel<string>();

  channel.onmessage = (raw) => {
    let event: LineStreamEvent;
    try {
      event = JSON.parse(raw) as LineStreamEvent;
    } catch {
      return;
    }
    if (event.type === "line") queue.push(event.line);
    else if (event.type === "end") queue.close();
  };

  const summary = start(channel);
  // A failed command sends no `end`, and nothing will ever arrive again, so the
  // reader must not keep the consumer waiting. The rejection still reaches the
  // caller through `summary`.
  summary.catch(() => queue.close());

  return {
    lines: queue,
    summary,
    cancel: () => {
      queue.close();
      void invoke("sync_cancel", { id: requestId }).catch(() => {
        // Cancelling is best effort: the command may already be finishing.
      });
    },
  };
}
