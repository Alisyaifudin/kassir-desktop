import { Effect } from "effect";
import { useCallback } from "react";
import { useStream } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";
import { isRunning, SYNC_IDLE, type SyncMode, type SyncState } from "~/services/sync";

export type SyncRunState = {
  /** The run, as the service sees it — from any screen, and after any screen is gone. */
  state: SyncState;
  running: boolean;
  start: (mode: SyncMode) => void;
  cancel: () => void;
};

/**
 * Reads the sync service's run state.
 *
 * This hook deliberately does **not** own the run: a sync is a background task
 * (`service.sync.start`), so unmounting a component that read this — the status
 * pill, its dialog, the Sinkronisasi panel — must not interrupt it. The service
 * keeps the fiber, the state and the report; the reader is disposable, which is
 * what lets the pill show the same run on every page.
 *
 * It is a reader rather than a context provider because every subscriber is a
 * leaf: a progress paint re-renders the pill and the dialog that asked for it and
 * nothing else.
 */
export function useSyncRun(): SyncRunState {
  const res = useStream(service.sync.state, () => SYNC_IDLE);
  const state = res.type === "success" ? res.data : SYNC_IDLE;

  const start = useCallback((mode: SyncMode) => {
    // `start` resolves as soon as the fiber is forked, so its outcome is not the
    // run's outcome: success, failure and progress all arrive through `state`.
    void Effect.runPromise(service.sync.start(mode)).catch((error: unknown) => {
      log.error(error instanceof Error ? error : new Error(String(error)));
    });
  }, []);

  const cancel = useCallback(() => {
    void Effect.runPromise(service.sync.cancel()).catch((error: unknown) => {
      log.error(error instanceof Error ? error : new Error(String(error)));
    });
  }, []);

  return { state, running: isRunning(state), start, cancel };
}
