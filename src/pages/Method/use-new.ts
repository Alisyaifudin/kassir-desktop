import { Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { useMethod } from "./use-method";

/** The add dialog: one name, filed under whichever tab is open. */
export function useNew(onClose: () => void) {
  const [kind] = useMethod();
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState<null | string>(null);
  const { pending, error, mutate } = useMutation((name: string) =>
    service.method.add({ name, kind }),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = input.trim();
    // A blank name would leave a nameless row in the list and the POS picker.
    if (name === "") {
      setInvalid("Harus ada");
      return;
    }
    setInvalid(null);
    const result = await mutate(name);
    if (Either.isLeft(result)) return;
    setInput("");
    onClose();
  }

  return {
    error: invalid ?? error?.message ?? null,
    loading: pending,
    handleSubmit,
    name: { value: input, set: setInput },
  };
}
