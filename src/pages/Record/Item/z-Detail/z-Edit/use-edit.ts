import { Either, Effect } from "effect";
import { useEffect, useState } from "react";
import { service } from "~/services";
import type { RecordFull } from "~/services/record";

/**
 * The note a record lets you correct without rewriting it. It is the dialog's
 * only field now that the payments are edited where they are read — in the money
 * band, behind its `Pencil` (see `use-payments.ts`).
 */
export function useSaveEdit(record: RecordFull, onSaved: () => void, open: boolean) {
  const [note, setNote] = useState(record.note);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote(record.note);
    setError(null);
  }, [open, record]);

  async function save() {
    // A correction that restates the same note would still bump
    // `record_updated_at` and the revision, and re-read the page for nothing.
    if (note === record.note) {
      onSaved();
      return;
    }
    setLoading(true);
    const result = await Effect.runPromise(
      service.record.set.note(record.id, note).pipe(Effect.either),
    );
    setLoading(false);
    Either.match(result, {
      onLeft: (failure) => setError(failure.message),
      onRight: () => {
        setError(null);
        onSaved();
      },
    });
  }

  return { note, setNote, error, loading, save } as const;
}
