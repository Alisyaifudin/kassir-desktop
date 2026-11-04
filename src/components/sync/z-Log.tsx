import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import type { SyncLogEntry } from "~/services/sync";
import { groupLabel } from "./z-Progress";

/**
 * The noun the log calls each entity by.
 *
 * The service says *what* crossed (`entity`, and the row's own name); the words are
 * here, with the other screen copy (`PHASE_LABEL`, `GROUP_LABEL`). A missing entry
 * falls back to the wire name: an entity this build does not know is still worth
 * printing.
 */
const ENTITY_NOUN: Record<string, string> = {
  pocket: "kantong",
  money: "catatan kas",
  customer: "pelanggan",
  supplier: "pemasok",
  method: "metode bayar",
  social: "media sosial",
  extra: "biaya tambahan",
  product: "produk",
  product_name: "nama lain produk",
  property: "properti",
  listing: "listing",
  image: "gambar",
  product_event: "stok",
  record: "transaksi",
};

function nounOf(entity: string): string {
  return ENTITY_NOUN[entity] ?? entity;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * `14:32:07` — wall clock, not elapsed.
 *
 * The header already counts how long the run has been going, and a finished run is
 * read after the fact: "12s" tells nobody whether the failure was before or after
 * the till was closed, and "14:32:07" does.
 */
export function clockOf(at: number): string {
  const date = new Date(at);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** A line's direction marker — the smallest thing that says which way it moved. */
type Mark = "down" | "up" | "note" | "error";

const MARK_GLYPH: Record<Mark, string> = {
  down: "↓",
  up: "↑",
  note: "·",
  error: "!",
};

/** One rendered line: the glyph, the sentence, and the moment. */
export type LogLine = { at: number; mark: Mark; text: string };

/** `produk Masker Kain` — the noun, then the row's own name when it has one. */
function namedOf(entity: string, label: string | null): string {
  const noun = nounOf(entity);
  return label === null ? noun : `${noun} ${label}`;
}

/** `Mengunduh produk Masker Kain` — a verb in front of the named object. */
function objectLine(verb: string, entity: string, label: string | null): string {
  return `${verb} ${namedOf(entity, label)}`;
}

/**
 * One entry as the sentence a cashier reads.
 *
 * Every sentence is built from the entry's own fields, so the log can never claim
 * more than the event carried: a tombstone has no name to print, and an image
 * without one is still counted.
 */
export function textOf(entry: SyncLogEntry): LogLine {
  switch (entry.kind) {
    case "pull":
      return { at: entry.at, mark: "down", text: objectLine("Mengunduh", entry.entity, entry.label) };
    case "delete":
      // The frame carried an id and nothing else, so the noun is all there is.
      return { at: entry.at, mark: "down", text: `Menghapus ${nounOf(entry.entity)}` };
    case "push": {
      const named = namedOf(entry.entity, entry.label);
      // The verdict is a prefix, not a verb: `Server menang: produk Masker Kain` —
      // the colon keeps it from reading as part of the name.
      if (entry.ack === "stale") {
        return { at: entry.at, mark: "up", text: `Server menang: ${named}` };
      }
      return {
        at: entry.at,
        mark: "up",
        text: entry.ack === "applied" ? `Mengunggah ${named}` : `Sudah ada ${named}`,
      };
    }
    case "image": {
      const where = entry.name === null ? "" : ` ${entry.name}`;
      const verb = entry.direction === "down" ? "Mengunduh" : "Mengunggah";
      return { at: entry.at, mark: entry.direction, text: `${verb} gambar${where} (${entry.done}/${entry.total})` };
    }
    case "merge": {
      const parts: string[] = [];
      if (entry.applied > 0) parts.push(`Menyimpan ${entry.applied} perubahan`);
      if (entry.noop > 0) parts.push(`Melewati ${entry.noop} data yang sudah ada`);
      if (entry.stale > 0) parts.push(`Mengikuti server untuk ${entry.stale} data`);
      // A parked money row is not an error and not a save: it is a row that has to
      // wait for the pocket it belongs to, and the operator should not have to
      // guess why one record is missing.
      if (entry.parked > 0) parts.push(`Menahan ${entry.parked} catatan kas (kantong belum ada)`);
      return { at: entry.at, mark: "note", text: parts.join(" · ") };
    }
    case "note":
      return { at: entry.at, mark: entry.level === "error" ? "error" : "note", text: entry.text };
  }
}

/** One row of the virtualized list: a line, or the header of a new group's block. */
type Row =
  | { key: string; kind: "group"; label: string }
  | { key: string; kind: "line"; line: LogLine }
  | { key: string; kind: "dropped"; count: number };

/**
 * The list the virtualizer walks: group headers interleaved with lines.
 *
 * The service publishes one flat run-level list, and the header between groups is
 * derived here rather than sent as an entry — a group boundary is a fact about the
 * *order* of the lines, which is exactly what the renderer already knows.
 */
export function rowsOf(logs: readonly SyncLogEntry[], dropped: number): Row[] {
  const rows: Row[] = [];
  if (dropped > 0) {
    rows.push({ key: "dropped", kind: "dropped", count: dropped });
  }
  let previous: string | null = null;
  logs.forEach((entry, index) => {
    if (entry.group !== null && entry.group !== previous) {
      rows.push({
        key: `group-${entry.group}-${index}`,
        kind: "group",
        label: groupLabel(entry.group),
      });
      previous = entry.group;
    }
    rows.push({ key: `line-${index}`, kind: "line", line: textOf(entry) });
  });
  return rows;
}

/**
 * The run's detail log: appended lines in a fixed-height box.
 *
 * Virtualized because a first sync writes one line per row — tens of thousands of
 * them — and a plain list of that many nodes is what makes a progress screen drop
 * frames exactly while it is working. Every row is one line, so the estimate is
 * exact and the list does not drift while it scrolls.
 *
 * The box follows the tail while the reader is at the bottom, and stops following
 * the moment they scroll up: a log that yanks itself back down while someone is
 * reading it is worse than one that is behind.
 */
export function SyncLog({
  logs,
  dropped,
  className = "h-56",
}: {
  logs: readonly SyncLogEntry[];
  dropped: number;
  className?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => rowsOf(logs, dropped), [logs, dropped]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    // A group header is a line of its own between blocks, and giving it its own
    // height is what keeps `pt` from pushing its text out of a line-height box.
    estimateSize: (index) => (rows[index]?.kind === "group" ? 24 : 20),
    overscan: 10,
  });

  /** Whether the view is pinned to the newest line. */
  const pinned = useRef(true);
  /**
   * The newest entry, by identity.
   *
   * `rows.length` alone stops changing once the ring is full — a full ring keeps
   * its length while the window slides — and following the tail would silently
   * stop at exactly the point a run is longest.
   */
  const tail = logs.length === 0 ? null : logs[logs.length - 1];

  useEffect(() => {
    if (!pinned.current || rows.length === 0) return;
    virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
  }, [tail, rows.length, virtualizer]);

  return (
    <div
      ref={parentRef}
      onScroll={() => {
        const element = parentRef.current;
        if (element === null) return;
        const left = element.scrollHeight - element.scrollTop - element.clientHeight;
        pinned.current = left < 24;
      }}
      className={`scroll-gutter overflow-y-auto rounded-md border bg-muted/30 p-2 font-mono text-xs ${className}`}
      aria-label="Rincian sinkronisasi"
    >
      {rows.length === 0 ? (
        <p className="p-1 text-muted-foreground">Belum ada aktivitas.</p>
      ) : (
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            if (row === undefined) return null;
            return (
              <div
                key={row.key}
                className="absolute inset-x-0 top-0 leading-5"
                style={{ height: `${item.size}px`, transform: `translateY(${item.start}px)` }}
              >
                <RowView row={row} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowView({ row }: { row: Row }) {
  if (row.kind === "group") {
    return (
      <p className="truncate pt-1 font-sans text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
        {row.label}
      </p>
    );
  }
  if (row.kind === "dropped") {
    return (
      <p className="truncate text-muted-foreground italic">
        …{row.count.toLocaleString("id-ID")} baris lebih lama disembunyikan
      </p>
    );
  }
  const { line } = row;
  return (
    <p className="flex gap-2">
      <span className="text-muted-foreground tabular-nums">{clockOf(line.at)}</span>
      <span
        className={
          line.mark === "error"
            ? "text-destructive"
            : line.mark === "note"
              ? "text-muted-foreground"
              : "text-foreground"
        }
      >
        {MARK_GLYPH[line.mark]}
      </span>
      <span className="truncate" title={line.text}>
        {line.text}
      </span>
    </p>
  );
}
