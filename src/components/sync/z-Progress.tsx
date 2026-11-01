import type { SyncState, SyncStatus } from "~/services/sync";

/**
 * The one word for each status.
 *
 * Shared by the Sinkronisasi panel and the status pill's dialog: two copies of a
 * nine-entry map is how "Membatalkan" ends up spelled two ways.
 */
export const PHASE_LABEL: Record<SyncStatus, string> = {
  idle: "Siap",
  preparing: "Menyiapkan",
  pull: "Mengunduh",
  merge: "Menyimpan",
  push: "Mengunggah",
  cancelling: "Membatalkan",
  done: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

/** `product_event` → `Product event`, for a label a cashier can read. */
export function entityLabel(entity: string): string {
  const words = entity.split("_");
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** True once a phase knows how many frames it owes. */
export function isDeterminate(state: SyncState): boolean {
  return state.total > 0;
}

export function percentOf(state: SyncState): number {
  if (!isDeterminate(state)) return 0;
  return Math.min(100, Math.round((state.done / state.total) * 100));
}

/**
 * The progress bar.
 *
 * Indeterminate (`w-1/3 animate-pulse`) until a phase knows its frame count: an
 * empty bar reads as "nothing is happening", and a bar pinned at 100% would lie.
 * The pulse is the only animation, and it stops under `motion-reduce`.
 */
export function SyncBar({ state }: { state: SyncState }) {
  const determinate = isDeterminate(state);
  const percent = percentOf(state);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={determinate ? state.total : undefined}
      aria-valuenow={determinate ? state.done : undefined}
      aria-label="Kemajuan sinkronisasi"
      className="h-1.5 overflow-hidden rounded-full bg-secondary"
    >
      <div
        className={
          determinate
            ? "h-full rounded-full bg-active transition-[width] duration-200"
            : "h-full w-1/3 animate-pulse rounded-full bg-active motion-reduce:animate-none"
        }
        style={determinate ? { width: `${percent}%` } : undefined}
      />
    </div>
  );
}
