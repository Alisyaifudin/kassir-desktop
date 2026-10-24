import { useCallback, useEffect, useState } from "react";
import { Effect } from "effect";
import { service } from "~/services";
import type { ProductEvent } from "~/services/product";

const PAGE = 20;

export type HistoryMode = "all" | "in" | "out";

/**
 * One page of the product's stock journal.
 *
 * Paging is a keyset on the full sort key (`createdAt` + `id`): a commit writes
 * one event per lot with the same `now`, so a cursor on the timestamp alone
 * skipped the rest of a same-instant group at a page boundary. The Masuk/Keluar
 * filter is passed to the query rather than applied here, so `done` and the empty
 * state describe the whole history, not just the page that happens to be loaded.
 *
 * `revision` is the product row's own revision counter, so it is `null` until the
 * row arrives: the journal cannot be asked for before then, and reporting
 * `loading` is the honest answer in the meantime (the card around it is drawn
 * from the first frame either way).
 */
export function useHistory(productId: string, revision: number | null, mode: HistoryMode) {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(
    async (before: { createdAt: number; id: string } | null, append: boolean) => {
      setLoading(true);
      setError(null);
      const result = await Effect.runPromise(
        service.product.stock
          .history(productId, {
            before: before ?? undefined,
            mode: mode === "all" ? undefined : mode,
            limit: PAGE,
          })
          .pipe(Effect.either),
      );
      if (result._tag === "Left") {
        setError(result.left.message);
        setLoading(false);
        return;
      }
      const page = result.right;
      setEvents((previous) => (append ? [...previous, ...page] : page));
      setDone(page.length < PAGE);
      setLoading(false);
    },
    [productId, mode],
  );

  // A new product, a new revision or a new filter starts over: keeping the old
  // rows (or the old cursor) would show events the query no longer matches.
  useEffect(() => {
    if (revision === null) return;
    setEvents([]);
    setDone(false);
    void load(null, false);
  }, [load, revision]);

  const loadMore = useCallback(() => {
    if (loading || done) return;
    const last = events[events.length - 1];
    if (last === undefined) return;
    void load({ createdAt: last.createdAt, id: last.id }, true);
  }, [loading, done, events, load]);

  return { events, loading, error, done, loadMore } as const;
}
