import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { SyncState } from "~/services/sync";
import { useSyncRun } from "./use-sync";
import { GroupBars, PHASE_LABEL, summaryOf } from "./z-Progress";

/**
 * How long the run has been going, in seconds.
 *
 * Counted from the service's `startedAt`, so it starts at the moment the run did
 * and not the moment the dialog opened. The interval only runs while there is
 * something to count: a finished run shows its own duration and stops re-rendering.
 */
function useElapsed(state: SyncState): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.startedAt === null || state.finishedAt !== null) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [state.startedAt, state.finishedAt]);

  if (state.startedAt === null) return "";
  const seconds = Math.max(0, Math.round(((state.finishedAt ?? now) - state.startedAt) / 1_000));
  return `${seconds} detik`;
}

/**
 * What the pill opens into: the run, in full — one bar per synced group.
 *
 * Modal because it is opened deliberately (a click on the pill, never by itself),
 * and because the one thing it can do besides report — Batal — should not be
 * reachable while the operator is looking at the till. Closing does not cancel
 * anything; `useSyncRun` is only a reader.
 *
 * The body is mounted only while open, so a closed dialog is not a second
 * subscriber to the run's state and has no interval running.
 */
export function SyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <SyncDialogBody /> : null}
    </Dialog>
  );
}

function SyncDialogBody() {
  const { state, running, cancel } = useSyncRun();
  const elapsed = useElapsed(state);
  const summary = summaryOf(state);

  return (
    <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col">
      <DialogHeader>
        <DialogTitle>Sinkronisasi</DialogTitle>
        <DialogDescription>
          {state.message === "" ? PHASE_LABEL[state.status] : state.message}
        </DialogDescription>
      </DialogHeader>

      <div className="scroll-gutter flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
          <GroupBars groups={state.groups} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {elapsed === "" ? "\u00a0" : elapsed}
          </p>
        </div>

        {summary === null ? null : <p className="text-sm text-muted-foreground">{summary}</p>}
        <TextError>{state.error}</TextError>

        <p className="text-xs text-muted-foreground">
          Sinkronisasi berjalan di latar belakang. Menutup jendela ini tidak menghentikannya, dan
          penjualan tetap bisa dilakukan selama proses berjalan.
        </p>
      </div>

      <DialogFooter className="gap-2">
        {running ? (
          <Button variant="ghost" onClick={cancel}>
            <X className="size-4" />
            Batal
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button variant="outline">Tutup</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
