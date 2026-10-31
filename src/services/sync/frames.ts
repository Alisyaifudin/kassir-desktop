/**
 * Frame encoding and decoding (contract §5).
 *
 * Outbound: one canonical `JSON.stringify` per frame, with the envelope keys in
 * the contract's order (`e` then `r`, then `ch`), and child keys in `CHILD_ORDER`.
 * Inbound: the server's tagged envelopes, parsed into discriminated unions so the
 * pull and ack loops never poke at raw JSON.
 */
import { CHILDREN, CHILD_ORDER, type Entity, type WireRow, type WireValue } from "./schema";

// ============================================================================
// Outbound (client → server): raw frame payloads, no `t` wrapper (§5.1)
// ============================================================================

/** `{"e":"product","r":{...}}` */
export function encodeRowFrame(entity: Entity, row: WireRow): string {
  return JSON.stringify({ e: entity, r: row });
}

/**
 * `{"e":"record","r":{...},"ch":{...}}`
 *
 * `ch` always carries all five arrays — empty ones included — because a reader
 * (and the server's wholesale replacement) must be able to tell "no children"
 * from "children omitted" (§5.2).
 */
export function encodeRecordFrame(row: WireRow, children: Record<string, WireRow[]>): string {
  const ch: Record<string, WireRow[]> = {};
  for (const key of CHILD_ORDER) {
    ch[key] = children[key] ?? [];
  }
  return JSON.stringify({ e: "record", r: row, ch });
}

// ============================================================================
// Inbound (server → client)
// ============================================================================

export type PullMetaFrame = { t: "meta"; snapshotSeq: number };
export type PullRowFrame = { t: "row"; seq: number; entity: Entity; row: WireRow };
export type PullAggregateFrame = {
  t: "ag";
  seq: number;
  entity: "record";
  row: WireRow;
  children: Record<string, WireRow[]>;
};
export type PullDoneFrame = { t: "done"; seq: number };
export type StreamErrorFrame = { t: "error"; code: string; message: string };

export type PullFrame = PullMetaFrame | PullRowFrame | PullAggregateFrame | PullDoneFrame;

export type AckAppliedFrame = { t: "ack"; index: number; outcome: "applied"; seq: number };
export type AckStaleFrame = {
  t: "ack";
  index: number;
  outcome: "stale";
  row: WireRow;
  children: Record<string, WireRow[]> | null;
};
export type AckNoopFrame = { t: "ack"; index: number; outcome: "noop" };
export type AckDoneFrame = { t: "done"; at: number; frames: number };

export type AckFrame = AckAppliedFrame | AckStaleFrame | AckNoopFrame | AckDoneFrame;

/** A frame the client cannot interpret — the run stops rather than guessing. */
export class FrameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrameError";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FrameError("Bingkai dari server bukan objek");
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FrameError(`Bingkai "${what}" tidak valid`);
  }
  return value;
}

function asString(value: unknown, what: string): string {
  if (typeof value !== "string") throw new FrameError(`Bingkai "${what}" tidak valid`);
  return value;
}

function asRow(value: unknown): WireRow {
  const record = asRecord(value);
  const row: WireRow = {};
  for (const [key, item] of Object.entries(record)) {
    row[key] = item as WireValue;
  }
  return row;
}

function asChildren(value: unknown): Record<string, WireRow[]> {
  const record = asRecord(value);
  const children: Record<string, WireRow[]> = {};
  for (const key of CHILD_ORDER) children[key] = [];
  for (const [key, rows] of Object.entries(record)) {
    if (!Array.isArray(rows)) continue;
    children[key] = rows.map(asRow);
  }
  return children;
}

export function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    throw new FrameError("Baris NDJSON dari server tidak dapat dibaca");
  }
}

/**
 * Decodes one pull-stream line. Returns `null` for a `{"t":"error"}` frame's
 * sibling types the caller handles itself (none today) so the switch stays
 * exhaustive at the call site.
 */
export function parsePullFrame(value: unknown): PullFrame | StreamErrorFrame {
  const frame = asRecord(value);
  const tag = frame["t"];
  switch (tag) {
    case "meta":
      return { t: "meta", snapshotSeq: asNumber(frame["snapshot_seq"], "meta") };
    case "row": {
      const entity = asString(frame["e"], "row");
      return {
        t: "row",
        seq: asNumber(frame["s"], "row"),
        entity: entity as Entity,
        row: asRow(frame["r"]),
      };
    }
    case "ag": {
      // §5.2: the seq precedes `t` on the wire, but key order does not matter to
      // the parser — only to the encoder.
      return {
        t: "ag",
        seq: asNumber(frame["s"], "ag"),
        entity: "record",
        row: asRow(frame["r"]),
        children: asChildren(frame["ch"]),
      };
    }
    case "done":
      return { t: "done", seq: asNumber(frame["s"], "done") };
    case "error":
      return {
        t: "error",
        code: typeof frame["code"] === "string" ? frame["code"] : "internal",
        message:
          typeof frame["message"] === "string" ? frame["message"] : "Server mengirim kesalahan",
      };
    default:
      throw new FrameError(`Bingkai "${String(tag)}" tidak dikenal`);
  }
}

/** Decodes one upload ack-stream line (§5.3, §5.4). */
export function parseAckFrame(value: unknown): AckFrame | StreamErrorFrame {
  const frame = asRecord(value);
  const tag = frame["t"];
  if (tag === "done") {
    return { t: "done", at: asNumber(frame["at"], "done"), frames: asNumber(frame["frames"], "done") };
  }
  if (tag === "error") {
    return {
      t: "error",
      code: typeof frame["code"] === "string" ? frame["code"] : "internal",
      message: typeof frame["message"] === "string" ? frame["message"] : "Server mengirim kesalahan",
    };
  }
  if (tag !== "ack") throw new FrameError(`Bingkai "${String(tag)}" tidak dikenal`);

  const index = asNumber(frame["i"], "ack");
  const outcome = frame["s"];
  if (outcome === "applied") {
    return { t: "ack", index, outcome, seq: asNumber(frame["seq"], "ack") };
  }
  if (outcome === "noop") {
    return { t: "ack", index, outcome };
  }
  if (outcome === "stale") {
    // A stale ack for a `record` frame carries the whole aggregate (§5.2), so
    // `ch` is present exactly when the payload is an aggregate.
    const children = frame["ch"] === undefined ? null : asChildren(frame["ch"]);
    return { t: "ack", index, outcome, row: asRow(frame["row"]), children };
  }
  throw new FrameError(`Hasil unggah "${String(outcome)}" tidak dikenal`);
}

/** The child definitions in wire order — re-exported for the statement builders. */
export { CHILDREN };
