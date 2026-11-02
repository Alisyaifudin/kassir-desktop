import { ProgressBar } from "~/components/ProgressBar";
import type { GroupState, SyncGroup, SyncState } from "~/services/sync";

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
  cancelling: "Membatalkan",
  done: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

/**
 * A group's name on screen.
 *
 * Today the only group is `money` (`pockets` + `money`); when the catalogue and
 * the records get their own groups they get their own lines here, and the panel
 * grows a bar each without any layout change.
 */
export const GROUP_LABEL: Record<SyncGroup, string> = {
  money: "Kas & Uang",
};

export function groupLabel(group: SyncGroup): string {
  return GROUP_LABEL[group] ?? group;
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
 * weighted, clamped-upward fraction of the entire cycle (see `live.ts`), so this
 * component only has to draw it.
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
 * Every group's bar, one per line: name, phase sentence, percentage, then the bar.
 *
 * The list is the point of the shape — a second group is another row, not another
 * redesign. With one group it reads exactly like a single sync's progress.
 */
export function GroupBars({ groups }: { groups: readonly GroupState[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
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
        </div>
      ))}
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
