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
 * The phases in which a group is actually moving.
 *
 * `idle` is before its turn, and `done`/`failed`/`cancelled` are after it: none of
 * them is work, and the screen shows one bar at a time — the group being worked
 * on.
 */
const WORKING: ReadonlySet<string> = new Set(["pull", "merge", "push", "settle"]);

/**
 * The group the screen is about — the one working, or the one that failed.
 *
 * Two claims, in this order: a run works one group at a time, so "working" names
 * exactly one. With nothing working, a failure is still the thing a reader needs
 * to see; a *finished* run shows no bar at all, because eight groups have already
 * gone by and any one of them would be a misleading pick. Its numbers are in the
 * summary line and its detail in the log.
 */
export function activeGroup(groups: readonly GroupState[]): GroupState | null {
  return (
    groups.find((group) => WORKING.has(group.phase)) ??
    groups.find((group) => group.phase === "failed") ??
    null
  );
}

/**
 * One group's bar: name, phase sentence, percentage, the bar, then the byte
 * counters.
 *
 * One bar for the whole cycle, not one per phase — see `SyncBar`.
 */
export function GroupBar({ group }: { group: GroupState }) {
  const transfer = transferOf(group);
  return (
    <div className="flex flex-col gap-1.5">
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
}

/**
 * The one bar the run shows.
 *
 * Eight bars at once asked the reader to find the moving one on every paint, and
 * a bar per group was eight rows of "Menunggu" until the group's turn came. The
 * run works one group at a time, so the screen does too; the rest of the run is
 * in the log underneath.
 */
export function ActiveBar({ groups }: { groups: readonly GroupState[] }) {
  const group = activeGroup(groups);
  return group === null ? null : <GroupBar group={group} />;
}

/** The one-line summary of a finished run, totalled across groups. */
export function summaryOf(state: SyncState): string | null {
  const report = state.report;
  if (report === null) return null;
  const stale = report.stale > 0 ? `, ${report.stale} diambil dari server` : "";
  // Pictures are the half a number of rows cannot describe: a run that moved the
  // whole catalogue and half its gallery is not a finished run, and saying so is
  // what stops an operator from wondering why the other till is missing photos.
  const images = report.imagesOwed > 0 ? ` · ${report.imagesOwed} gambar belum terkirim` : "";
  return `${report.pulled} diunduh, ${report.pushed} diunggah${stale}${images}.`;
}
