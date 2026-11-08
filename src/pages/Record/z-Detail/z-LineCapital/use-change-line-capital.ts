import { useState } from "react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/**
 * Rewriting one line's recorded cost. The revision bump is what refreshes the
 * record: the ledger re-reads, and the line shows the cost it now carries.
 *
 * `by` is the signed-in user, passed in rather than read here so the write can
 * be tested without a session — the note line it appends is the only record of
 * who changed the figure.
 */
export function useChangeLineCapital(id: string, listingId: string, by: string) {
  const [error, setError] = useState<string | null>(null);
  const {
    pending,
    error: failure,
    mutate,
  } = useMutation((input: { capital: number; reason: string }) =>
    service.record.set.lineCapital(id, listingId, { ...input, by }),
  );

  async function change(capital: number, reason: string) {
    const result = await mutate({ capital, reason });
    // `useMutation` keeps the failure for its own render; the dialog closes on
    // success only, so the refusal is also handed back as a message.
    setError(result._tag === "Left" ? result.left.message : null);
    return result._tag === "Right";
  }

  return { loading: pending, error: error ?? failure?.message ?? null, change } as const;
}
