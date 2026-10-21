import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/** Moving the credit's date; the record revision refreshes the view. */
export function useChangeCreditAt(id: string) {
  const { pending, error, mutate } = useMutation((input: { id: string; creditAt: number }) =>
    service.record.set.creditAt(input.id, input.creditAt),
  );

  async function change(creditAt: number) {
    await mutate({ id, creditAt });
  }

  return { loading: pending, error: error?.message ?? null, change } as const;
}
