import { Effect, Either } from "effect";
import { useRef, useState } from "react";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { normalizeMarginEstimate, type MarginEstimate } from "~/services/analytics";

/** How long a field may sit still before the page re-asks and the value is kept. */
const SETTLE_MS = 400;

/**
 * The Profit page's estimate: what a line is worth as margin when its stored cost
 * is missing, or is really the price it sold for.
 *
 * Two values, on purpose. `estimate` moves with the fields, so what the operator
 * types is what they see; `settled` moves only after a pause, and it is the one
 * the query and the write use. Typing `10` percent would otherwise run the margin
 * SQL over every line in the period for a `1`, then again for the `10` — and
 * store the `1` first.
 *
 * The config layer hydrated the stored numbers before the first paint, so the
 * first read is a ref read rather than I/O: the page's opening query carries the
 * operator's own rule instead of running twice with two different answers.
 */
export function useMarginEstimate() {
  const [estimate, setEstimate] = useState<MarginEstimate>(() =>
    Effect.runSync(service.config.marginEstimate.get()),
  );
  const [settled] = useDebounce(estimate, SETTLE_MS);
  const { pending, error, mutate } = useMutation(service.config.marginEstimate.set);

  // What is actually on disk, to fall back on when a write is refused: the
  // fields must not keep showing a rule the page is not using.
  const kept = useRef(estimate);
  const persist = useDebouncedCallback((next: MarginEstimate) => {
    void mutate(next).then((result) => {
      if (Either.isRight(result)) {
        kept.current = next;
        return;
      }
      setEstimate(kept.current);
    });
  }, SETTLE_MS);

  function change(patch: Partial<MarginEstimate>) {
    const next = normalizeMarginEstimate({ ...estimate, ...patch });
    setEstimate(next);
    persist(next);
  }

  return { estimate, settled, pending, error, change } as const;
}
