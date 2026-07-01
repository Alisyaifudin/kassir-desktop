import { useCallback, useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import { DuplicateError } from "~/lib/error-effect";

export type ProgressEntry<T, E> =
  | { state: "pending"; item: T }
  | { state: "error"; item: T; error: E | DuplicateError }
  | { state: "success"; item: T };

export function useUploadProgress<T, E>({
  items,
  getId,
  add,
}: {
  items: T[];
  getId: (item: T) => string;
  add: (item: T) => Effect.Effect<void, E>;
}) {
  const startedRef = useRef(false);
  const [progress, setProgress] = useState<ProgressEntry<T, E>[]>(() =>
    items.map((item) => ({ state: "pending", item })),
  );

  const init = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const insertedSet = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = getId(item);
      if (insertedSet.has(id)) {
        setProgress((prev) => {
          const next = [...prev];
          next[i] = {
            state: "error",
            item,
            error: DuplicateError.new(`Duplikat. Data dengan id: ${id} sudah dimasukkan.`),
          };
          return next;
        });
        continue;
      }
      const error = await Effect.runPromise(
        add(item).pipe(
          Effect.as(null),
          Effect.catchAll((e) => Effect.succeed(e)),
        ),
      );
      setProgress((prev) => {
        const next = [...prev];
        if (error) {
          next[i] = { state: "error", item, error };
        } else {
          insertedSet.add(id);
          next[i] = { state: "success", item };
        }
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return progress;
}
