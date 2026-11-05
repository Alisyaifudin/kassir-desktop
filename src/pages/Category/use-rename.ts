import { Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { categoryMessage } from "./util-category";

/**
 * The inline rename on one category row. The input is local so typing does not
 * touch the service until submit; the write updates the ref, so the row — and the
 * product form's picker — re-renders from one source.
 */
export function useRename(id: string, name: string) {
  const [input, setInput] = useState(name);
  const [invalid, setInvalid] = useState<null | string>(null);
  const { pending, error, mutate } = useMutation((next: string) =>
    service.category.set.name(id, next),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = input.trim();
    if (next === "") {
      setInvalid("Harus ada");
      return;
    }
    setInvalid(null);
    // Unchanged is not a write: a submit that changes nothing must not bump the
    // row's clock and put it back in the sync queue.
    if (next === name) return;
    const result = await mutate(next);
    if (Either.isRight(result)) setInput(next);
  }

  return {
    error: invalid ?? categoryMessage(error),
    loading: pending,
    handleSubmit,
    name: { value: input, set: setInput },
  };
}
