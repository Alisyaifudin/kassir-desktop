import { Either } from "effect";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useStream } from "~/components/Loader";
import { service } from "~/services";
import { AUTO_DEFAULT, type AutoSync } from "~/services/sync";

/**
 * The auto-sync switches, as one read/write pair.
 *
 * The service's stream is the truth — it is what the scheduler acts on — and the
 * local copy moves the moment a switch is clicked so the control tracks the
 * pointer instead of the disk. A refused write puts the copy back on the stored
 * value, so a switch can only ever show a schedule the app is actually on.
 *
 * `nextAt` comes along for the countdown. It is the service's, not this hook's:
 * the panel is free to unmount and the deadline does not move with it.
 */
export function useAutoSync() {
  const res = useStream(service.sync.auto.changes);
  const stored = res.type === "success" ? res.data.auto : AUTO_DEFAULT;
  const nextAt = res.type === "success" ? res.data.nextAt : null;
  const { pending, error, mutate } = useMutation(service.sync.auto.set);

  const [auto, setAuto] = useState<AutoSync>(stored);
  useEffect(() => setAuto(stored), [stored]);

  const patch = useCallback(
    (next: Partial<AutoSync>) => {
      setAuto((current) => ({ ...current, ...next }));
      void mutate(next).then((either) => {
        if (Either.isLeft(either)) setAuto(stored);
      });
    },
    [mutate, stored],
  );

  return { auto, nextAt, pending, error, patch };
}
