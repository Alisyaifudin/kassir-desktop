import { RefreshCw, RotateCcw, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useSyncRun } from "~/components/sync/use-sync";
import { SyncLog } from "~/components/sync/z-Log";
import { ActiveBar, PHASE_LABEL, summaryOf } from "~/components/sync/z-Progress";

/**
 * The Sinkronisasi action (contract § "The sync loop", `<sync_ui_design>`).
 *
 * One button runs the whole run: every group in turn, one bar showing the group
 * being worked on (today one — `Kas & Uang`). That bar covers the group's entire
 * cycle, so it fills once instead of restarting at pull → merge → push; it is an
 * indeterminate sliver only until the first page gives it a denominator. The
 * buttons disable each other while a run is in flight, but the run is not theirs:
 * it is a background task (`service.sync.start`), so leaving this screen keeps it
 * going and the status pill takes over from here.
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
          Isi alamat server dan token di atas, lalu simpan. Tombol sinkronisasi aktif setelah
          keduanya tersimpan.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-base">
          {state.message === "" ? PHASE_LABEL[state.status] : state.message}
        </p>
        <ActiveBar groups={state.groups} />
      </div>

      <SyncLog logs={state.logs} dropped={state.logsDropped} />

      {summary === null ? null : <p className="text-sm text-muted-foreground">{summary}</p>}
      {state.report !== null && (state.report.pending > 0 || state.report.orphans > 0) ? (
        <p className="text-sm text-muted-foreground">
          {state.report.pending > 0
            ? `${state.report.pending} baris uang menunggu kas yang belum masuk`
            : null}
          {state.report.pending > 0 && state.report.orphans > 0 ? " · " : null}
          {state.report.orphans > 0
            ? `${state.report.orphans} baris tersembunyi karena induknya dihapus`
            : null}
        </p>
      ) : null}
      <TextError>{state.error}</TextError>
      <p className="text-xs text-muted-foreground">
        Satu putaran penuh: unduh perubahan, simpan sekaligus, lalu unggah — untuk kas, pelanggan,
        pemasok, metode pembayaran, media sosial, biaya tambahan, produk dan stok, paket combo,
        serta catatan transaksi. Sinkronisasi Ulang mengosongkan posisi unduh dan mengirim ulang
        seluruh data lokal — gunakan hanya bila data terlihat tidak cocok dengan server, atau sekali
        setelah pembaruan ke sinkronisasi baru. Untuk sinkronisasi berkala, atur di panel
        Sinkronisasi Otomatis di bawah.
      </p>
    </div>
  );
}
