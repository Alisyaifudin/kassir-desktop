import { Effect, Fiber } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStream } from "~/components/Loader";
import { service } from "~/services";
import type { SyncMode, SyncProgress, SyncReport } from "~/services/sync";

export type SyncRunState = {
  running: boolean;
  error: string | null;
  report: SyncReport | null;
  progress: SyncProgress;
  start: (mode: SyncMode) => void;
  cancel: () => void;
};

const IDLE: SyncProgress = { phase: "idle", entity: null, done: 0, total: 0, message: "" };

/**
 * Runs one sync and keeps the screen's view of it.
 *
 * The fiber is owned here rather than by `useMutation`: the contract says leaving
 * the screen cancels the sync, and interrupting the fiber is also what makes the
 * Rust side stop the HTTP request (`sync_cancel` runs from the loop's interrupt
 * finalizer). A `useMutation` promise would keep running after unmount.
 */
export function useSyncRun(): SyncRunState {
  const progressRes = useStream(service.sync.progress, () => IDLE);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const fiberRef = useRef<Fiber.RuntimeFiber<void, never> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const fiber = fiberRef.current;
      // Leaving the screen cancels: the run's finalizers call `sync_cancel`, so
      // the request stops instead of draining in the background.
      if (fiber !== null) void Effect.runFork(Fiber.interrupt(fiber));
      fiberRef.current = null;
    };
  }, []);

  const start = useCallback((mode: SyncMode) => {
    if (fiberRef.current !== null) return;
    setRunning(true);
    setError(null);
    setReport(null);

    const program = Effect.gen(function* () {
      const outcome = yield* Effect.either(service.sync.run(mode));
      if (!mounted.current) return;
      setRunning(false);
      if (outcome._tag === "Left") setError(outcome.left.message);
      else setReport(outcome.right);
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          fiberRef.current = null;
          if (mounted.current) setRunning(false);
        }),
      ),
    );

    fiberRef.current = Effect.runFork(program);
  }, []);

  const cancel = useCallback(() => {
    const fiber = fiberRef.current;
    fiberRef.current = null;
    setRunning(false);
    if (fiber !== null) void Effect.runFork(Fiber.interrupt(fiber));
  }, []);

  return {
    running,
    error,
    report,
    progress: progressRes.type === "success" ? progressRes.data : IDLE,
    start,
    cancel,
  };
}
