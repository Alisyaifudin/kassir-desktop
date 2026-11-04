import { ProgressBar } from "~/components/ProgressBar";
import type { GroupState, SyncGroup, SyncState, TransferSide } from "~/services/sync";

/**
 * The one word for each phase.
 *
 * Shared by the Sinkronisasi panel and the status pill's dialog: two copies of a
 * map like this is how "Membatalkan" ends up spelled two ways. It covers the
 * run-level statuses (`preparing`, `running`) and the per-group phases
 * (`pull`, `merge`, `push`, …) because a bar and a pill each render one of them.
 */
export const PHASE_LABEL: Record<string, string> = {
  idle: "Siap",
  preparing: "Menyiapkan",
  running: "Berjalan",
  pull: "Mengunduh",
  merge: "Menyimpan",
  push: "Mengunggah",
  settle: "Memeriksa",
  cancelling: "Membatalkan",
  done: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

/**
 * A group's name on screen.
 *
 * One line per synced group, in the order the cycle visits them. The panel grows
 * a bar for each without any layout change.
 */
export const GROUP_LABEL: Record<SyncGroup, string> = {
  money: "Kas & Uang",
  customer: "Pelanggan",
  supplier: "Pemasok",
  method: "Metode Pembayaran",
  social: "Media Sosial",
  extra: "Biaya Tambahan",
  product: "Produk & Stok",
  record: "Catatan Transaksi",
};

export function groupLabel(group: SyncGroup): string {
  return GROUP_LABEL[group] ?? group;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/**
 * `1,2 MB` — a byte count a cashier can read at a glance.
 *
 * Binary units (1024), Indonesian separators, and no decimals below a kilobyte:
 * "0,4 B" is noise, and the byte counter exists to answer "how much longer",
 * which one significant decimal answers and three do not.
 */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: value >= 100 || unit === 0 ? 0 : 1,
  })} ${BYTE_UNITS[unit]}`;
}

/**
 * One direction's counter: `1,2 MB dari ~4,8 MB`.
 *
 * The total is where the running pass will end, and it wears a `~` because even an
 * exact per-pass figure is not a total for the whole group. A pass that has
 * nothing left to size drops it — "1 KB dari ~1 KB" is noise — and a direction
 * with no known total is just the byte count: a bare number is honest, a made-up
 * denominator is not.
 */
function sideText(side: TransferSide): string {
  const moved = formatBytes(side.bytes);
  return side.total === null || side.total <= side.bytes
    ? moved
    : `${moved} dari ~${formatBytes(side.total)}`;
}

/**
 * The byte counters under one bar, one direction each.
 *
 * A percentage cannot tell a shop whether the slow part is an index of rows or a
 * hundred photographs; this line can. A direction appears once it has moved
 * something, or while it is the phase running — so a fresh pull shows
 * `↓ 0 B` from the first page, and two finished directions stay on screen after
 * the run. The closing pull is a pull of the same direction: it keeps the `↓`
 * counter on screen while it checks (§ `settle`).
 */
export function transferOf(group: GroupState): string | null {
  const parts: string[] = [];
  const { down, up } = group.transfer;
  if (down.bytes > 0 || group.phase === "pull" || group.phase === "settle") {
    parts.push(`↓ ${sideText(down)}`);
  }
  if (up.bytes > 0 || group.phase === "push") parts.push(`↑ ${sideText(up)}`);
  return parts.length === 0 ? null : parts.join(" · ");
}

/** True once the group's work has a size — before the first page it has none. */
export function isDeterminate(group: GroupState): boolean {
  return group.progress !== null;
}

/** 0…100, whole numbers: a jittering decimal reads as instability, not detail. */
export function percentOf(group: GroupState): number {
  return Math.min(100, Math.round((group.progress ?? 0) * 100));
}

/** The bar's caption: the group's own sentence, or its phase when it has none. */
export function captionOf(group: GroupState): string {
  return group.message === "" ? (PHASE_LABEL[group.phase] ?? group.phase) : group.message;
}

/**
 * One group's progress bar.
 *
 * There is **one bar per group for the whole cycle**, not one per phase: a bar
 * that empties when pull becomes merge becomes push moves backwards four times a
 * run, which reads as failing rather than working. `group.progress` is the
 * planned, clamped-upward fraction of the entire cycle (see `planCycle` in
 * `live.ts`), so this component only has to draw it.
 *
 * Before the first page returns there is no denominator, so the bar is an
 * indeterminate sliver (`motion-reduce` stops the pulse). The fill carries a
 * short transition so a page landing glides instead of jumping.
 */
export function SyncBar({ group }: { group: GroupState }) {
  return (
    <ProgressBar
      percent={isDeterminate(group) ? percentOf(group) : null}
      failed={group.phase === "failed"}
      label={`Kemajuan sinkronisasi ${groupLabel(group.group)}`}
    />
  );
}

/**
 * Every group's bar, one per line: name, phase sentence, percentage, the bar, then
 * the byte counters.
 *
 * The list is the point of the shape — a second group is another row, not another
 * redesign. With one group it reads exactly like a single sync's progress.
 */
export function GroupBars({ groups }: { groups: readonly GroupState[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const transfer = transferOf(group);
        return (
          <div key={group.group} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-base">
                <span className="font-medium">{groupLabel(group.group)}</span>
                <span className="text-muted-foreground"> · {captionOf(group)}</span>
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {isDeterminate(group) ? `${percentOf(group)}%` : "\u00a0"}
              </p>
            </div>
            <SyncBar group={group} />
            {transfer === null ? null : (
              <p className="text-xs text-muted-foreground tabular-nums">{transfer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The one-line summary of a finished run, totalled across groups. */
export function summaryOf(state: SyncState): string | null {
  const report = state.report;
  if (report === null) return null;
  const stale = report.stale > 0 ? `, ${report.stale} diambil dari server` : "";
  return `${report.pulled} diunduh, ${report.pushed} diunggah${stale}.`;
}
