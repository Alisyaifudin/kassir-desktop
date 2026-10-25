import { Effect, Either } from "effect";
import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { useUser } from "~/hooks/use-user";
import { log } from "~/lib/log";
import { service } from "~/services";

/**
 * Renames the signed-in cashier. The session copy is updated too, so the topbar
 * and the receipt cashier name follow without a reload.
 */
export function useUpdateName() {
  const user = useUser();
  const [input, setInput] = useState(user.name);
  const { pending, error, mutate } = useMutation((name: string) =>
    service.cashier.set.name(user.id, name).pipe(
      Effect.zipRight(service.auth.set({ ...user, name })),
    ),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await mutate(input);
    if (Either.isLeft(result)) log.error(result.left);
  }

  return {
    loading: pending,
    error: error?.message ?? null,
    handleSubmit,
    name: { value: input, set: setInput },
  };
}
