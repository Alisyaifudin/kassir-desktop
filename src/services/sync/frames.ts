/**
 * NDJSON frame encoding and decoding for every v2 group (`SYNC-V2.md` §2.3, §3.2,
 * §4.4).
 *
 * Outbound a push body is *bare frames*, one per line, with no `t` wrapper:
 * `{"e":"pocket","r":{…}}` for a row and
 * `{"e":"record","r":{…},"ch":{…}}` for the record aggregate. Inbound every line
 * starts with `t`, which is what makes a pull response and a push response
 * distinguishable while streaming.
 *
 * Parsing is strict about the frames we do understand — guessing would write the
 * wrong row — but tolerant in the two places §2.9 requires: an unknown `t` on a
 * pull line and a line for an entity this group does not carry are skipped, not
 * fatal, because the bookmark still has to move past them.
 */
import {
  TABLES,
  aggregateOf,
  childrenOf,
  emptyChildren,
  isEntity,
  toCanonicalChild,
  toCanonicalRow,
  type EntityDef,
  type SyncGroup,
  type WireChildren,
  type WireRow,
} from "./schema";

// ============================================================================
// Outbound (client → server): bare frames, no `t` (§4.1)
// ============================================================================

/** `{"e":"money","r":{…}}`, keys in canonical column order. */
export function encodeRowFrame(entity: string, row: WireRow): string {
  return JSON.stringify({ e: entity, r: row });
}

/** `{"e":"record","r":{…},"ch":{…}}` (or `combo`) — one whole aggregate, never a child alone. */
export function encodeAggregateFrame(
  entity: string,
  row: WireRow,
  children: WireChildren,
): string {
  return JSON.stringify({ e: entity, r: row, ch: children });
}

// ============================================================================
// Inbound (server → client)
// ============================================================================

/**
 * First line of a pull response: the highest seq that existed when it started.
 *
 * `count` is how many entries **this group** has left in `(bookmark, snapshot]`,
 * and it is only there when the client asked for it (`?count=1`, the first page
 * of a pull sequence). It is the bar's only honest denominator: `snapshot` is the
 * shared counter, so a group with three changes among five hundred seqs would
 * otherwise look 0% done while it is in fact finished. `null` when the server
 * did not send one — an older server, or a page that was not the first.
 */
export type PullMetaFrame = { t: "meta"; snapshot: number; count: number | null };

/** One change whose row exists. `s` is the change's seq. */
export type PullRowFrame = { t: "row"; s: number; e: string; r: WireRow };

/** One change whose aggregate exists (§3.2, §8.8). */
export type PullAggregateFrame = { t: "ag"; s: number; e: string; r: WireRow; ch: WireChildren };

/**
 * One change whose row is gone (§6).
 *
 * Reserved: nothing produces this today. Applied anyway — deleting a local row
 * is the only sane reading — rather than crashing a run on a legal frame.
 */
export type PullDelFrame = { t: "del"; s: number; e: string; id: string };

/** Last line of a pull response. `s` is the highest seq actually sent. */
export type PullDoneFrame = { t: "done"; s: number; more: boolean };

export type PullFrame = PullMetaFrame | PullRowFrame | PullAggregateFrame | PullDelFrame | PullDoneFrame;

/** One ack per pushed frame, in the order the frames were sent (§4.4). */
export type AckFrame =
  | { t: "ack"; i: number; e: string; s: "applied"; seq: number }
  | { t: "ack"; i: number; e: string; s: "noop"; seq: number }
  | {
      t: "ack";
      i: number;
      e: string;
      s: "stale";
      seq: number;
      row: WireRow;
      ch: WireChildren | null;
    };

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

/** A number the server may omit — absent and non-numeric both mean "not sent". */
function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function requireId(value: unknown, what: string): string {
  if (typeof value !== "string" || value === "") {
    throw new FrameError(`Server tidak mengirim ${what} yang valid`);
  }
  return value;
}

function requireObject(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FrameError(`Server tidak mengirim ${what} yang valid`);
  }
  return value as Record<string, unknown>;
}

/** Parses a row payload against the entity's column dictionary. */
function requireRow(def: EntityDef, value: unknown): WireRow {
  try {
    return toCanonicalRow(def, requireObject(value, `data ${def.entity}`));
  } catch (error) {
    throw new FrameError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Parses the child arrays of an aggregate.
 *
 * Every key the group declares must be present and no unknown key may appear:
 * the children are replaced wholesale, so a missing key would silently delete a
 * child set (§8.8).
 */
function requireChildren(group: SyncGroup, value: unknown): WireChildren {
  const children = childrenOf(group);
  if (children.length === 0) {
    throw new FrameError(`Grup ${group} tidak punya agregat`);
  }
  const source = requireObject(value, "data anak agregat");
  const known = new Set(children.map((child) => child.key));
  for (const key of Object.keys(source)) {
    if (!known.has(key)) {
      throw new FrameError(`Server mengirim kumpulan anak agregat yang tidak dikenal: ${key}`);
    }
  }
  const out = emptyChildren(group);
  for (const child of children) {
    const rows = source[child.key];
    if (!Array.isArray(rows)) {
      throw new FrameError(`Server tidak mengirim ${child.key} pada agregat`);
    }
    try {
      out[child.key] = rows.map((row) => toCanonicalChild(child, requireObject(row, child.key)));
    } catch (error) {
      throw new FrameError(error instanceof Error ? error.message : String(error));
    }
  }
  return out;
}

/** The entity def when it belongs to `group`; `null` means "skip this line". */
function entityIn(group: SyncGroup, value: unknown): EntityDef | null {
  if (!isEntity(value)) return null;
  const def = TABLES[value];
  if (def === undefined || def.group !== group) return null;
  return def;
}

/**
 * Decodes one pull line, or `null` when the line is not for this client (§2.9).
 *
 * `null` is returned for an unknown `t` and for an entity this group does not
 * carry: skipping either is required, because aborting the page would never let
 * the bookmark move past it. A malformed frame we *do* understand still throws.
 */
export function parsePullFrame(group: SyncGroup, value: Record<string, unknown>): PullFrame | null {
  switch (value["t"]) {
    case "meta":
      return {
        t: "meta",
        snapshot: requireNumber(value["snapshot"], "snapshot"),
        count: optionalNumber(value["count"]),
      };
    case "row": {
      const def = entityIn(group, value["e"]);
      if (def === null) return null;
      if (def.kind === "aggregate") {
        // A record is always an `ag` frame; a bare row would advance the bookmark
        // past an aggregate this device never applied.
        throw new FrameError("Server mengirim rekaman sebagai baris tunggal");
      }
      return {
        t: "row",
        s: requireNumber(value["s"], "urutan perubahan"),
        e: def.entity,
        r: requireRow(def, value["r"]),
      };
    }
    case "ag": {
      const def = aggregateOf(group);
      if (def === undefined) return null;
      if (value["e"] !== def.entity) {
        throw new FrameError(`Server mengirim agregat bukan ${def.entity}: ${String(value["e"])}`);
      }
      return {
        t: "ag",
        s: requireNumber(value["s"], "urutan perubahan"),
        e: def.entity,
        r: requireRow(def, value["r"]),
        ch: requireChildren(group, value["ch"]),
      };
    }
    case "del": {
      const def = entityIn(group, value["e"]);
      if (def === null) return null;
      return {
        t: "del",
        s: requireNumber(value["s"], "urutan perubahan"),
        e: def.entity,
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
      // §2.9: an unknown `t` is skipped, never fatal.
      return null;
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
  const entity = value["e"];
  if (!isEntity(entity)) {
    throw new FrameError(`Server mengirim entitas yang tidak dikenal: ${String(entity)}`);
  }
  const def = TABLES[entity];
  if (def === undefined) {
    throw new FrameError(`Server mengirim entitas yang tidak dikenal: ${String(entity)}`);
  }
  const i = requireNumber(value["i"], "indeks frame");
  const seq = requireNumber(value["seq"], "urutan baris");
  switch (value["s"]) {
    case "applied":
      return { t: "ack", i, e: entity, s: "applied", seq };
    case "noop":
      return { t: "ack", i, e: entity, s: "noop", seq };
    case "stale": {
      const row = requireRow(def, value["row"]);
      // A record `stale` carries the winning children too (§4.4, §8.8); a row
      // `stale` carries none.
      const ch = def.kind === "aggregate" ? requireChildren(def.group, value["ch"]) : null;
      return { t: "ack", i, e: entity, s: "stale", seq, row, ch };
    }
    default:
      throw new FrameError(`Jawaban unggahan tidak dikenal: ${String(value["s"])}`);
  }
}
