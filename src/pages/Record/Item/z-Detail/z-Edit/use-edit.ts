import { Either, Effect } from "effect";
import { useEffect, useState } from "react";
import { service } from "~/services";
import type { RecordFull } from "~/services/record";

/**
 * The two fields a record lets you correct without rewriting it: the note, and
 * the method the payment was filed under. Both are corrections to what the
 * record *says*, so they share one Simpan and one error — a dialog that saved
 * each field on its own would leave the cashier guessing which half landed.
 *
 * A split payment has no single method to correct, so `methodId` stays `null`
 * and the dialog does not offer the picker.
 */
export function useSaveEdit(record: RecordFull, onSaved: () => void, open: boolean) {
  const method = record.methods.length === 1 ? record.methods[0].methodId : null;
  const [note, setNote] = useState(record.note);
  const [methodId, setMethodId] = useState<string | null>(method);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote(record.note);
    setMethodId(method);
    setError(null);
  }, [open, record, method]);

  async function save() {
    const noteChanged = note !== record.note;
    const methodChanged = methodId !== null && methodId !== method;
    if (!noteChanged && !methodChanged) {
      onSaved();
      return;
    }
    setLoading(true);
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        if (noteChanged) yield* service.record.set.note(record.id, note);
        // The method is skipped when it did not move: a correction that restates
        // the same row would still bump `record_updated_at` and the revision.
        if (methodId !== null && methodChanged) {
          yield* service.record.set.method(record.id, methodId);
        }
      }).pipe(Effect.either),
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

  return { note, setNote, methodId, setMethodId, error, loading, save } as const;
}
