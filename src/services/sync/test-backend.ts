/**
 * An in-memory *backend* for the sync protocol — test support, not production code.
 *
 * The difference from a stub: this one behaves like `kassir-backend` is specified to
 * behave, so a test can assert the outcome instead of the calls. It keeps rows in a
 * seq-ordered mirror, assigns `sync_seq` on every applied frame, resolves conflicts
 * with the same last-writer-wins rule the server uses (the server keeps ties and
 * answers `stale` with its own copy), dedupes the append-only journal with `noop`,
 * and verifies the upload pointer — offset *and* the §7.3 prefix hash chain — before
 * accepting a chunk.
 *
 * It deliberately does not run SQL: the wire is what is under test here, and the
 * client's own SQL is covered against a real SQLite in `sync.test.ts`.
 */
import { createHash } from "node:crypto";
import type { Database } from "bun:sqlite";
import { CHILD_ORDER, TABLES, type Entity, type WireRow } from "./schema";
import type { LineStream, StreamSummary } from "./stream";
import { EMPTY_CHAIN } from "./chain";
import { TransportError, type ChainState, type Endpoint, type Session, type SyncTransport } from "./transport";

/** One row as the backend holds it. `children` exists for `record` aggregates. */
export type BackendRow = {
  entity: Entity;
  row: WireRow;
  children?: Record<string, WireRow[]>;
};

/** A frame the backend applied, in the order it applied them. */
export type AppliedFrame = { entity: Entity; pk: string; seq: number; outcome: "applied" | "stale" | "noop" };

export function chainStep(prevHex: string, line: string): string {
  const prev = prevHex === "" ? Buffer.alloc(0) : Buffer.from(prevHex, "hex");
  return createHash("sha256").update(prev).update("\n").update(line, "utf8").digest("hex");
}

export function chainOf(prev: string, lines: readonly string[]): ChainState {
  let chain = prev;
  let bytes = 0;
  for (const line of lines) {
    chain = chainStep(chain, line);
    bytes += Buffer.byteLength(line, "utf8") + 1;
  }
  return { chain, bytes };
}

function lineStream(lines: readonly string[]): LineStream {
  return {
    lines: (async function* () {
      for (const line of lines) yield line;
    })(),
    summary: Promise.resolve<StreamSummary>({ lines: lines.length, cancelled: false }),
    cancel: () => undefined,
  };
}

function failedStream(status: number, code: string): LineStream {
  return {
    lines: (async function* () {})(),
    summary: Promise.reject(new TransportError(status, code, code)),
    cancel: () => undefined,
  };
}

function pkOf(entity: Entity): string {
  return TABLES[entity].pk;
}

export class MockBackend implements SyncTransport {
  /** The mirror, keyed `entity\u0000pk`. */
  private readonly mirror = new Map<string, { seq: number; row: BackendRow }>();
  private readonly sessions = new Map<string, { at: number; frames: number; chain: string }>();
  /** Every frame this backend accepted, in order — the audit trail a test asserts on. */
  readonly applied: AppliedFrame[] = [];
  /** Chunks received, with the pointer each claimed — chain/offset assertions. */
  readonly chunks: { offset: number; prefix: string; lines: number }[] = [];
  /** Requests served, so a test can prove a re-pull did or did not happen. */
  pulls = 0;
  /** Merge transactions applied (mirrors the Rust command's one-per-pull shape). */
  merges = 0;
  private db: Database | undefined;
  private seq = 0;
  private sessionsCreated = 0;

  /** Current max `sync_seq`, i.e. the `snapshot_seq` a pull reports. */
  get snapshot(): number {
    return this.seq;
  }

  get sessionCount(): number {
    return this.sessionsCreated;
  }

  /** Data that already exists on the server, as if another device had pushed it. */
  seed(row: BackendRow): this {
    this.seq += 1;
    this.mirror.set(`${row.entity}\u0000${pkOf(row.entity) ? String(row.row[pkOf(row.entity)]) : ""}`, {
      seq: this.seq,
      row,
    });
    return this;
  }

  /** Reads one row's wire payload back, for assertions. */
  get(entity: Entity, id: string): WireRow | null {
    return this.mirror.get(`${entity}\u0000${id}`)?.row.row ?? null;
  }

  /** Reads a whole aggregate (header plus its five child arrays). */
  aggregate(entity: Entity, id: string): BackendRow | null {
    return this.mirror.get(`${entity}\u0000${id}`)?.row ?? null;
  }

  /** How many rows of an entity the backend holds. */
  count(entity: Entity): number {
    let total = 0;
    for (const entry of this.mirror.values()) if (entry.row.entity === entity) total += 1;
    return total;
  }

  /** Every row of an entity, in `sync_seq` order. */
  rows(entity: Entity): BackendRow[] {
    return [...this.mirror.values()]
      .filter((entry) => entry.row.entity === entity)
      .sort((a, b) => a.seq - b.seq)
      .map((entry) => entry.row);
  }

  health() {
    return Promise.resolve({ protocol: 1, snapshotSeq: this.seq });
  }

  createSession(): Promise<Session> {
    this.sessionsCreated += 1;
    const id = `ul_${this.sessionsCreated}`;
    this.sessions.set(id, { at: 0, frames: 0, chain: EMPTY_CHAIN });
    return Promise.resolve({ uploadId: id, at: 0, frames: 0 });
  }

  getSession(_endpoint: Endpoint, uploadId: string): Promise<Session> {
    const session = this.sessions.get(uploadId);
    if (session === undefined) {
      return Promise.reject(new TransportError(404, "not_found", "unknown session"));
    }
    return Promise.resolve({ uploadId, at: session.at, frames: session.frames });
  }

  deleteSession(_endpoint: Endpoint, uploadId: string): Promise<void> {
    this.sessions.delete(uploadId);
    return Promise.resolve();
  }

  pull(_endpoint: Endpoint, input: { since: number; limit: number }): LineStream {
    this.pulls += 1;
    const snapshot = this.seq;
    const page = [...this.mirror.values()]
      .filter((entry) => entry.seq > input.since)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, input.limit);

    const lines = [JSON.stringify({ t: "meta", snapshot_seq: snapshot })];
    for (const entry of page) {
      const { entity, row, children } = entry.row;
      lines.push(
        children === undefined
          ? JSON.stringify({ t: "row", s: entry.seq, e: entity, r: row })
          : JSON.stringify({ t: "ag", s: entry.seq, e: entity, r: row, ch: children }),
      );
    }
    const lastSeq = page.length === 0 ? input.since : (page[page.length - 1]?.seq ?? input.since);
    lines.push(JSON.stringify({ t: "done", s: lastSeq }));
    return lineStream(lines);
  }

  uploadChunk(
    _endpoint: Endpoint,
    input: { uploadId: string; offset: number; prefixSha: string; body: string; compress: boolean },
  ): LineStream {
    const session = this.sessions.get(input.uploadId);
    if (session === undefined) return failedStream(404, "not_found");
    // §7.2/§7.3: the pointer and the chain must agree, or the session is suspect.
    if (session.at !== input.offset || session.chain !== input.prefixSha) {
      return failedStream(409, "replay_mismatch");
    }

    const lines = input.body.split("\n").filter((line) => line !== "");
    this.chunks.push({ offset: input.offset, prefix: input.prefixSha, lines: lines.length });

    const acks: string[] = [];
    let chain = session.chain;
    for (const [index, line] of lines.entries()) {
      const frameIndex = session.frames + index;
      const frame = JSON.parse(line) as {
        e: Entity;
        r: WireRow;
        ch?: Record<string, WireRow[]>;
      };
      const outcome = this.apply(frame);
      if (outcome === "stale") {
        const winning = this.aggregate(frame.e, String(frame.r[pkOf(frame.e)]));
        acks.push(
          JSON.stringify({
            t: "ack",
            i: frameIndex,
            s: "stale",
            row: winning?.row ?? frame.r,
            ch: winning?.children,
          }),
        );
      } else if (outcome === "noop") {
        acks.push(JSON.stringify({ t: "ack", i: frameIndex, s: "noop" }));
      } else {
        acks.push(JSON.stringify({ t: "ack", i: frameIndex, s: "applied", seq: this.seq }));
      }
      chain = chainStep(chain, line);
    }

    const bytes = lines.reduce((total, line) => total + Buffer.byteLength(line, "utf8") + 1, 0);
    session.at += bytes;
    session.frames += lines.length;
    session.chain = chain;

    return lineStream([
      ...acks,
      JSON.stringify({ t: "done", at: session.at, frames: session.frames }),
    ]);
  }

  chain(prev: string, lines: string[]): Promise<ChainState> {
    return Promise.resolve(chainOf(prev, lines));
  }

  /**
   * Attaches the SQLite handle the merge writes to.
   *
   * In the app this is the Rust `sync_merge` command, which borrows the plugin's
   * pool. Here it is the same in-memory database the services read, driven through
   * one `BEGIN … COMMIT` — so a test exercises the real merge path instead of a
   * stub, and can assert how many transactions it took.
   */
  attachDatabase(db: Database): this {
    this.db = db;
    return this;
  }

  /** Empties the mirror, as if the server had been restored from nothing. */
  wipe(): this {
    this.mirror.clear();
    this.sessions.clear();
    this.applied.length = 0;
    this.chunks.length = 0;
    this.seq = 0;
    return this;
  }

  /** The merge API: one transaction, all statements or none. */
  merge(statements: { sql: string; bindings?: (string | number | null)[] }[]): Promise<{ statements: number }> {
    const db = this.db;
    if (db === undefined) {
      return Promise.reject(new Error("MockBackend.attachDatabase() was not called"));
    }
    this.merges += 1;
    try {
      db.exec("BEGIN");
      for (const statement of statements) {
        db.query(statement.sql).run(...(statement.bindings ?? []));
      }
      db.exec("COMMIT");
      return Promise.resolve({ statements: statements.length });
    } catch (error) {
      db.exec("ROLLBACK");
      return Promise.reject(error);
    }
  }

  /** Server-side apply: LWW per §6.2, append-only journal per §6.3. */
  private apply(frame: { e: Entity; r: WireRow; ch?: Record<string, WireRow[]> }): "applied" | "stale" | "noop" {
    const pk = String(frame.r[pkOf(frame.e)]);
    const key = `${frame.e}\u0000${pk}`;
    const existing = this.mirror.get(key);

    if (frame.e === "product_event") {
      if (existing !== undefined) {
        this.applied.push({ entity: frame.e, pk, seq: existing.seq, outcome: "noop" });
        return "noop";
      }
      this.seq += 1;
      this.mirror.set(key, { seq: this.seq, row: { entity: frame.e, row: frame.r } });
      this.applied.push({ entity: frame.e, pk, seq: this.seq, outcome: "applied" });
      return "applied";
    }

    const clock = (row: WireRow) => Number(row[TABLES[frame.e].updatedAt]);
    if (existing !== undefined && !(clock(frame.r) > clock(existing.row.row))) {
      // §6.2: on a tie the server keeps its own copy and says so with `stale`.
      this.applied.push({ entity: frame.e, pk, seq: existing.seq, outcome: "stale" });
      return "stale";
    }

    this.seq += 1;
    this.mirror.set(key, {
      seq: this.seq,
      row: {
        entity: frame.e,
        row: frame.r,
        // An aggregate's children are replaced wholesale (§5.2), and an empty
        // array is a real answer, so `ch` presence is what decides.
        children:
          frame.ch === undefined
            ? undefined
            : Object.fromEntries(CHILD_ORDER.map((childKey) => [childKey, frame.ch?.[childKey] ?? []])),
      },
    });
    this.applied.push({ entity: frame.e, pk, seq: this.seq, outcome: "applied" });
    return "applied";
  }
}
