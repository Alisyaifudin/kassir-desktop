import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { isRunning } from "~/services/sync";
import { useSyncRun } from "./use-sync";
import { SyncDialog } from "./z-Dialog";

/**
 * The status pill: a small green pulse while a sync runs, a red one when it
 * failed.
 *
 * The run is a background task, so without this the only way to know one is
 * happening would be to open Pengaturan → Sinkronisasi — and a failure there
 * would be silent, because nothing brings a cashier to that screen.
 *
 * The failure pill stays until it is seen: dismissed by closing its dialog, or
 * replaced by the next run. Keyed on `finishedAt` so a *new* failure re-appears
 * after an old one was dismissed.
 *
 * Its text never changes during a run — no counters, no entity names — so the
 * `aria-live` region announces "Menyinkronkan" once instead of narrating every
 * frame. The dialog is where the numbers live.
 */
export function SyncPill() {
  const { state } = useSyncRun();
  const [open, setOpen] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const running = isRunning(state);
  const dismissed = dismissedAt !== null && dismissedAt === state.finishedAt;
  const failed = state.status === "failed" && !dismissed;
  const visible = running || failed;

  function changeDialog(next: boolean): void {
    setOpen(next);
    // Closing the dialog is how the operator says "I have seen this". Closing it
    // while the run is going says nothing about the run: it keeps going.
    if (!next && state.status === "failed") setDismissedAt(state.finishedAt);
  }

  return (
    <>
      {visible ? (
        <div role="status" aria-live="polite" className="pointer-events-auto">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className={
              failed
                ? "relative flex h-8 items-center gap-2 rounded-full bg-destructive px-3 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
                : "relative flex h-8 items-center gap-2 rounded-full bg-emerald-500 px-3 text-xs font-medium text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            }
          >
            {failed ? (
              <AlertTriangle className="size-3.5" aria-hidden />
            ) : (
              <span className="relative flex size-2 shrink-0">
                {/* The pulse is the halo, not the pill: fading the label to 50%
                    opacity is the one thing a status badge must not do. */}
                <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-white" />
              </span>
            )}
            {failed ? "Sinkronisasi gagal" : "Menyinkronkan"}
          </button>
        </div>
      ) : null}

      {/* Mounted even when the pill is gone: a run that finishes while the dialog
          is open has to be able to say so, and by then there is no pill to click. */}
      <SyncDialog open={open} onOpenChange={changeDialog} />
    </>
  );
}
