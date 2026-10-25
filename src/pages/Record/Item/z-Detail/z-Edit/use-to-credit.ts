import { Either } from "effect";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

export function useToCredit(id: string, onSuccess: () => void) {
  const { pending, error, mutate } = useMutation(service.record.set.toCredit);

  async function makeCredit() {
    const result = await mutate(id);
    if (Either.isRight(result)) onSuccess();
  }

  return { loading: pending, error: error?.message ?? null, makeCredit };
}
