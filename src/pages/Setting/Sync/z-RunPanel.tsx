import { RefreshCw, RotateCcw, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useSyncRun } from "~/components/sync/use-sync";
import { GroupBars, PHASE_LABEL, summaryOf } from "~/components/sync/z-Progress";

/**
 * The Sinkronisasi action (contract § "The sync loop", `<sync_ui_design>`).
 *
 * One button runs the whole run: every group in turn, each with its own bar
 * (today one — `Kas & Uang`). That bar covers the group's entire cycle, so it
 * fills once instead of restarting at pull → merge → push; it is an indeterminate
 * sliver only until the first page gives it a denominator. The buttons disable
 * each other while a run is in flight, but the run is not theirs: it is a
 * background task (`service.sync.start`), so leaving this screen keeps it going
 * and the status pill takes over from here.
 */
export function RunPanel({ configured }: { configured: boolean }) {
  const { state, running, start, cancel } = useSyncRun();
  const summary = summaryOf(state);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => start("sync")} disabled={running || !configured}>
          <RefreshCw className="size-4" />
          Sinkronisasi
        </Button>
        <Button variant="outline" onClick={() => start("reset")} disabled={running || !configured}>
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
          Isi token di atas, lalu simpan. Tombol sinkronisasi aktif setelah token tersimpan.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-base">
          {state.message === "" ? PHASE_LABEL[state.status] : state.message}
        </p>
        <GroupBars groups={state.groups} />
      </div>

      {summary === null ? null : <p className="text-sm text-muted-foreground">{summary}</p>}
      <TextError>{state.error}</TextError>
      <p className="text-xs text-muted-foreground">
        Sinkronisasi berjalan manual: unduh perubahan, simpan sekaligus, lalu unggah. Yang
        disinkronkan baru kas (pocket) dan catatan uang. Sinkronisasi Ulang mengosongkan posisi
        unduh dan mengirim ulang seluruh data kas dan uang — gunakan hanya bila data terlihat tidak
        cocok dengan server, atau sekali setelah pembaruan ke sinkronisasi baru.
      </p>
    </div>
  );
}
