import { Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/**
 * The inline rename on one cashier row. The input is local so typing does not
 * touch the service until submit; the write updates the ref, so the rest of the
 * list — and the row itself — re-render from one source.
 */
export function useRename(cashierId: string, name: string) {
  const [input, setInput] = useState(name);
  const [invalid, setInvalid] = useState<null | string>(null);
  const { pending, error, mutate } = useMutation((next: string) =>
    service.cashier.set.name(cashierId, next),
  );

  async function handleSubmit() {
    const next = input.trim();
    // A blank name would leave a nameless row in the login picker.
    if (next === "") {
      setInvalid("Harus ada");
      return;
    }
    setInvalid(null);
    const result = await mutate(next);
    if (Either.isRight(result)) setInput(next);
  }

  return {
    loading: pending,
    error: invalid ?? error?.message ?? null,
    handleSubmit,
    name: {
      value: input,
      setName(value: string) {
        setInvalid(null);
        setInput(value);
      },
    },
  };
}
