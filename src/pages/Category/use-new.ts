import { Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { categoryMessage } from "./util-category";

/** The add dialog: one name. */
export function useNew(onClose: () => void) {
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState<null | string>(null);
  const { pending, error, mutate } = useMutation((name: string) =>
    service.category.add({ name }),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = input.trim();
    // A blank name would leave a nameless row in the list and in the product
    // form's picker.
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
    // The local check wins: it is about what is in the box right now, while the
    // service error is about the name that was sent.
    error: invalid ?? categoryMessage(error),
    loading: pending,
    handleSubmit,
    name: { value: input, set: setInput },
  };
}
