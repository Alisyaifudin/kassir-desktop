import { RefreshCw, RotateCcw, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useSyncRun } from "~/components/sync/use-sync";
import { entityLabel, isDeterminate, PHASE_LABEL, SyncBar } from "~/components/sync/z-Progress";

/**
 * The Sinkronisasi action (contract § "The sync loop", `<sync_ui_design>`).
 *
 * One button runs the whole loop: pull → merge → push, in the contract's order.
 * The progress line is the only animation — a determinate bar while a phase knows
 * its frame count, indeterminate before the first page lands. The buttons disable
 * each other while a run is in flight, but the run is not theirs: it is a
 * background task (`service.sync.start`), so leaving this screen keeps it going
 * and the status pill takes over from here.
 */
export function RunPanel({ configured }: { configured: boolean }) {
  const { state, running, start, cancel } = useSyncRun();
  const determinate = isDeterminate(state);

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
            {state.message === "" ? PHASE_LABEL[state.status] : state.message}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {state.entity === null ? "\u00a0" : entityLabel(state.entity)}
            {determinate ? ` ${state.done}/${state.total}` : ""}
          </p>
        </div>
        {/* Indeterminate until the phase knows how many frames it owes the server. */}
        <SyncBar state={state} />
      </div>

      {state.report === null ? null : (
        <p className="text-sm text-muted-foreground">
          {state.report.pulled} diunduh, {state.report.pushed} diunggah
          {state.report.stale > 0 ? `, ${state.report.stale} diambil dari server` : ""}.
        </p>
      )}
      <TextError>{state.error}</TextError>
      <p className="text-xs text-muted-foreground">
        Sinkronisasi berjalan manual: unduh perubahan, simpan sekaligus, lalu unggah. Sinkronisasi
        Ulang mengosongkan posisi unduh, menghapus sesi unggah, dan mengirim ulang seluruh data —
        gunakan hanya bila data terlihat tidak cocok dengan server.
      </p>
    </div>
  );
}
