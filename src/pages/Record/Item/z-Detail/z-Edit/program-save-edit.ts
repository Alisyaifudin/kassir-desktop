import { Effect } from "effect";
import type { RecordMode } from "~/services/record";
import { service } from "~/services";

export type Payment = { methodId: string; pay: number };

/** Apply all fields the edit dialog owns, in a deliberate order. */
export function programSaveEdit(input: {
  id: string;
  originalMode: RecordMode;
  mode: RecordMode;
  originalNote: string;
  note: string;
  methods: Payment[];
}) {
  return Effect.gen(function* () {
    // Mode first: it moves stock, and it fails when the shelf cannot cover the
    // change — better to know before note and payment edits have been written.
    if (input.mode !== input.originalMode) {
      yield* service.record.set.mode(input.id, input.mode);
    }
    yield* service.record.set.methods(input.id, input.methods);
    if (input.note !== input.originalNote) {
      yield* service.record.set.note(input.id, input.note);
    }
  });
}
