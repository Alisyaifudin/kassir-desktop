import { Effect, Either } from "effect";
import { useEffect, useState } from "react";
import { useMutation, useStream } from "~/components/Loader";
import { service } from "~/services";
import { DEFAULT_ZOOM, type Zoom } from "~/services/zoom";

/**
 * The app's interface scale.
 *
 * The service's stream is the truth — it is what the boot-time apply read, and
 * what `set` echoes once the webview took the new level. This copy moves the
 * moment the slider does so the thumb tracks the pointer, and it is put back on
 * the stored level if the webview refuses the change, so the control can only
 * ever show a scale the app is actually at.
 */
export function useZoom() {
  const res = useStream(service.zoom.changes, () => Effect.runSync(service.zoom.get()));
  const stored = res.type === "success" ? res.data : DEFAULT_ZOOM;
  const { pending, error, mutate } = useMutation(service.zoom.set);

  const [zoom, setZoom] = useState<Zoom>(stored);
  useEffect(() => setZoom(stored), [stored]);

  async function change(next: Zoom) {
    setZoom(next);
    const either = await mutate(next);
    if (Either.isLeft(either)) setZoom(stored);
  }

  return { zoom, pending, error, change };
}
