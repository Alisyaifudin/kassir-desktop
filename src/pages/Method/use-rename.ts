import { Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/**
 * The inline rename on one method row. The input is local so typing does not
 * touch the service until submit; the write updates the ref, so the row — and
 * anything else listing methods — re-renders from one source.
 */
export function useRename(id: string, name: string) {
  const [input, setInput] = useState(name);
  const [invalid, setInvalid] = useState<null | string>(null);
  const { pending, error, mutate } = useMutation((next: string) =>
    service.method.set.name(id, next),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = input.trim();
    // The base rows carry a null name; this guards the named ones the page shows.
    if (next === "") {
      setInvalid("Harus ada");
      return;
    }
    setInvalid(null);
    const result = await mutate(next);
    if (Either.isRight(result)) setInput(next);
  }

  return {
    error: invalid ?? error?.message ?? null,
    loading: pending,
    handleSubmit,
    name: { value: input, set: setInput },
  };
}
