import { useState } from "react";
import { Either } from "effect";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

export function useNewPocket(onClose: () => void) {
  const [name, setName] = useState("");
  const { pending, error, mutate } = useMutation(service.money.pockets.add);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (trimmed === "") {
      toast.error("Nama kantong tidak boleh kosong");
      return;
    }
    if (trimmed.length > 20) {
      toast.error("Nama kantong tidak boleh lebih dari 20 karakter");
      return;
    }
    const result = await mutate({ name: trimmed, type: "absolute" });
    if (Either.isRight(result)) {
      setName("");
      onClose();
    }
  }

  return { name, setName, error: error?.message ?? null, loading: pending, handleSubmit };
}
