/**
 * NDJSON frame encoding and decoding for the v2 money group (§4, §6.2, §7.3).
 *
 * Outbound a push body is *bare row frames*, one per line, with no `t` wrapper:
 * `{"e":"pocket","r":{…}}`. Inbound every line starts with `t`, which is what
 * makes a pull response and a push response distinguishable while streaming.
 *
 * Parsing is strict on purpose: a frame this client cannot interpret is a bug or
 * a protocol mismatch, and guessing would write the wrong row. `FrameError` names
 * the line, the caller turns it into a `SyncError` with the sentence on screen.
 */
import { isEntity, TABLES, toCanonicalRow, type Entity, type WireRow } from "./schema";

// ============================================================================
// Outbound (client → server): bare row frames, no `t` (§4.3, §7.1)
// ============================================================================

/** `{"e":"money","r":{…}}`, keys in canonical column order. */
export function encodeRowFrame(entity: Entity, row: WireRow): string {
  return JSON.stringify({ e: entity, r: row });
}

// ============================================================================
// Inbound (server → client)
// ============================================================================

/** First line of a pull response: the highest seq that existed when it started. */
export type PullMetaFrame = { t: "meta"; snapshot: number };

/** One change whose row exists. `s` is the change's seq. */
export type PullRowFrame = { t: "row"; s: number; e: Entity; r: WireRow };

/**
 * One change whose row is gone (§9.3).
 *
 * Reserved: nothing produces this today. Applied anyway — deleting a local row
 * is the only sane reading — rather than crashing a run on a legal frame.
 */
export type PullDelFrame = { t: "del"; s: number; e: Entity; id: string };

/** Last line of a pull response. `s` is the highest seq actually sent. */
export type PullDoneFrame = { t: "done"; s: number; more: boolean };

export type PullFrame = PullMetaFrame | PullRowFrame | PullDelFrame | PullDoneFrame;

/** One ack per pushed frame, in the order the frames were sent (§7.3). */
export type AckFrame =
  | { t: "ack"; i: number; e: Entity; s: "applied"; seq: number }
  | { t: "ack"; i: number; e: Entity; s: "noop"; seq: number }
  | { t: "ack"; i: number; e: Entity; s: "stale"; seq: number; row: WireRow };

/** Last line of a push response. */
export type PushDoneFrame = { t: "done"; frames: number };

export type PushFrame = AckFrame | PushDoneFrame;

/** A line the client cannot interpret — the run stops rather than guessing. */
export class FrameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrameError";
  }
}

/** Parses one NDJSON line into a JSON object, or explains why it is not one. */
export function parseLine(line: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new FrameError(`Baris server tidak bisa dibaca: ${line.slice(0, 120)}`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FrameError(`Baris server bukan objek: ${line.slice(0, 120)}`);
  }
  return value as Record<string, unknown>;
}

function requireNumber(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FrameError(`Server tidak mengirim ${what} yang valid`);
  }
  return value;
}

function requireId(value: unknown, what: string): string {
  if (typeof value !== "string" || value === "") {
    throw new FrameError(`Server tidak mengirim ${what} yang valid`);
  }
  return value;
}

function requireEntity(value: unknown): Entity {
  if (!isEntity(value)) {
    throw new FrameError(`Server mengirim entitas yang tidak dikenal: ${String(value)}`);
  }
  return value;
}

/** Parses a row payload against the entity's column dictionary. */
function requireRow(entity: Entity, value: unknown): WireRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FrameError(`Server tidak mengirim data ${entity} yang valid`);
  }
  try {
    return toCanonicalRow(TABLES[entity], value as Record<string, unknown>);
  } catch (error) {
    throw new FrameError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Decodes one pull line.
 *
 * An unexpected `t` is a protocol mismatch, not something to skip: skipping it
 * silently would advance the bookmark past a change this device never applied.
 */
export function parsePullFrame(value: Record<string, unknown>): PullFrame {
  switch (value["t"]) {
    case "meta":
      return { t: "meta", snapshot: requireNumber(value["snapshot"], "snapshot") };
    case "row": {
      const e = requireEntity(value["e"]);
      return {
        t: "row",
        s: requireNumber(value["s"], "urutan perubahan"),
        e,
        r: requireRow(e, value["r"]),
      };
    }
    case "del": {
      const e = requireEntity(value["e"]);
      return {
        t: "del",
        s: requireNumber(value["s"], "urutan perubahan"),
        e,
        id: requireId(value["id"], "id baris"),
      };
    }
    case "done":
      return {
        t: "done",
        s: requireNumber(value["s"], "urutan akhir"),
        more: value["more"] === true,
      };
    default:
      throw new FrameError(`Baris unduhan tidak dikenal: ${String(value["t"])}`);
  }
}

/** Decodes one push (ack) line. */
export function parsePushFrame(value: Record<string, unknown>): PushFrame {
  if (value["t"] === "done") {
    return { t: "done", frames: requireNumber(value["frames"], "jumlah frame") };
  }
  if (value["t"] !== "ack") {
    throw new FrameError(`Baris unggahan tidak dikenal: ${String(value["t"])}`);
  }
  const e = requireEntity(value["e"]);
  const i = requireNumber(value["i"], "indeks frame");
  const seq = requireNumber(value["seq"], "urutan baris");
  switch (value["s"]) {
    case "applied":
      return { t: "ack", i, e, s: "applied", seq };
    case "noop":
      return { t: "ack", i, e, s: "noop", seq };
    case "stale":
      return { t: "ack", i, e, s: "stale", seq, row: requireRow(e, value["row"]) };
    default:
      throw new FrameError(`Jawaban unggahan tidak dikenal: ${String(value["s"])}`);
  }
}
