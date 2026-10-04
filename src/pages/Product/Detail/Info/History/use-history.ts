import { useCallback, useEffect, useState } from "react";
import { Effect } from "effect";
import { service } from "~/services";
import type { ProductEvent } from "~/services/product";

const PAGE = 20;

export function useHistory(productId: string, revision: number) {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(
    async (before: number | null, append: boolean) => {
      setLoading(true);
      setError(null);
      const result = await Effect.runPromise(
        service.product.stock
          .history(productId, { before: before ?? undefined, limit: PAGE })
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
    [productId],
  );

  useEffect(() => {
    setEvents([]);
    setDone(false);
    void load(null, false);
  }, [load, revision]);

  const loadMore = useCallback(() => {
    if (loading || done) return;
    const last = events[events.length - 1];
    if (last === undefined) return;
    void load(last.createdAt, true);
  }, [loading, done, events, load]);

  return { events, loading, error, done, loadMore } as const;
}
