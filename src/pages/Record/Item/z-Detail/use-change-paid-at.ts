import { Either } from "effect";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/**
 * Moving a record to another day. The record re-reads itself afterwards (the
 * service bumps its revision), so there is nothing to revalidate — only the
 * failure to report, since the date on screen would otherwise look like it moved.
 */
export function useChangePaidAt(id: string) {
  const { pending, error, mutate } = useMutation((input: { id: string; paidAt: number }) =>
    service.record.set.paidAt(input.id, input.paidAt),
  );

  /** `true` when the record accepted the time; the editor keeps its dialog open
   *  otherwise, so the failure is readable instead of closing over it. */
  async function change(paidAt: number): Promise<boolean> {
    const result = await mutate({ id, paidAt });
    return Either.isRight(result);
  }

  return { loading: pending, error: error?.message ?? null, change } as const;
}
