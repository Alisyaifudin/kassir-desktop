import { useState } from "react";
import { Either } from "effect";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

export function useUpdateName(pocketId: string, nameInit: string) {
  const [name, setName] = useState(nameInit);
  const { pending, mutate } = useMutation((input: { id: string; name: string }) =>
    service.money.pockets.set.name(input.id, input.name),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      toast.error("Nama kantong tidak boleh kosong");
      return;
    }
    if (trimmed.length > 20) {
      toast.error("Nama kantong tidak boleh lebih dari 20 karakter");
      return;
    }
    const result = await mutate({ id: pocketId, name: trimmed });
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
    }
  }

  return { name, setName, loading: pending, handleSubmit };
}
