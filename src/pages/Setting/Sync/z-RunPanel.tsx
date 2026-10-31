import { RefreshCw, RotateCcw, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import type { SyncProgress } from "~/services/sync";
import { useSyncRun } from "./use-sync-run";

const PHASE_LABEL: Record<SyncProgress["phase"], string> = {
  idle: "Siap",
  pull: "Mengunduh",
  merge: "Menyimpan",
  push: "Mengunggah",
  done: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

/** `product_event` → `Product event`, for a label a cashier can read. */
function entityLabel(entity: string): string {
  const words = entity.split("_");
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * The Sinkronisasi action (contract § "The sync loop", `<sync_ui_design>`).
 *
 * One button runs the whole loop: pull → merge → push, in the contract's order.
 * The progress line is the only animation — a determinate bar while a phase knows
 * its frame count, indeterminate before the first page lands. The buttons disable
 * each other while a run is in flight, and leaving the screen interrupts the run
 * (`useSyncRun` owns the fiber).
 */
export function RunPanel({ configured }: { configured: boolean }) {
  const { running, error, report, progress, start, cancel } = useSyncRun();

  const determinate = progress.total > 0;
  const percent = determinate
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => start("sync")} disabled={running || !configured}>
          <RefreshCw className="size-4" />
          Sinkronisasi
        </Button>
        <Button
          variant="outline"
          onClick={() => start("reset")}
          disabled={running || !configured}
        >
          <RotateCcw className="size-4" />
          Sinkronisasi Ulang
        </Button>
        {running ? (
          <Button variant="ghost" onClick={cancel}>
            <X className="size-4" />
            Batal
          </Button>
        ) : null}
      </div>

      {configured ? null : (
        <p className="text-sm text-muted-foreground">
          Isi alamat server dan token di atas, lalu simpan. Tombol sinkronisasi aktif setelah
          keduanya tersimpan.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base">
            {progress.message === "" ? PHASE_LABEL[progress.phase] : progress.message}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {progress.entity === null ? "\u00a0" : entityLabel(progress.entity)}
            {determinate ? ` ${progress.done}/${progress.total}` : ""}
          </p>
        </div>
        {/* Indeterminate until the phase knows how many frames it owes the server. */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={determinate ? progress.total : undefined}
          aria-valuenow={determinate ? progress.done : undefined}
          aria-label="Kemajuan sinkronisasi"
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className={
              determinate
                ? "h-full rounded-full bg-active transition-[width] duration-200"
                : "h-full w-1/3 animate-pulse rounded-full bg-active"
            }
            style={determinate ? { width: `${percent}%` } : undefined}
          />
        </div>
      </div>

      {report === null ? null : (
        <p className="text-sm text-muted-foreground">
          {report.pulled} diunduh, {report.pushed} diunggah
          {report.stale > 0 ? `, ${report.stale} diambil dari server` : ""}.
        </p>
      )}
      <TextError>{error}</TextError>
      <p className="text-xs text-muted-foreground">
        Sinkronisasi berjalan manual: unduh perubahan, simpan sekaligus, lalu unggah. Sinkronisasi
        Ulang mengosongkan posisi unduh, menghapus sesi unggah, dan mengirim ulang seluruh data —
        gunakan hanya bila data terlihat tidak cocok dengan server.
      </p>
    </div>
  );
}
