import { Either, Effect } from "effect";
import { useEffect, useState } from "react";
import { service } from "~/services";
import type { RecordFull } from "~/services/record";

/**
 * The one mutable text field on a record. Everything else that makes up the
 * transaction is frozen; this only changes what was written on it.
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
