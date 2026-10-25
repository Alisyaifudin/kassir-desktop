import { Effect, Either } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { useUser } from "~/hooks/use-user";
import { hash } from "~/lib/auth";
import { log } from "~/lib/log";
import { service } from "~/services";

/**
 * Replaces the signed-in cashier's password hash. The hash is computed by the
 * Tauri side, the same as at login and cashier creation; the cashier service
 * stores whatever hash it is given.
 */
export function useUpdatePassword() {
  const user = useUser();
  const [input, setInput] = useState("");
  const { pending, error, mutate } = useMutation((password: string) =>
    hash(password).pipe(
      Effect.flatMap((passwordHash) => service.cashier.set.password(user.id, passwordHash)),
    ),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await mutate(input);
    if (Either.isLeft(result)) {
      log.error(result.left);
      return;
    }
    setInput("");
    toast.success("Berhasil diperbarui");
  }

  return {
    loading: pending,
    error: error?.message ?? null,
    handleSubmit,
    password: { value: input, set: setInput },
  };
}
