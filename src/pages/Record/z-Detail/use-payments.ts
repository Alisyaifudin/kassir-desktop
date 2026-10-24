import { Either, Effect } from "effect";
import { useEffect, useState } from "react";
import { METHOD_BASE_ID } from "~/lib/constants";
import { generateId } from "~/lib/random";
import { service } from "~/services";
import type { RecordFull } from "~/services/record";

/** One payment row being edited — the record's own row id, or a fresh one. */
export type PaymentDraft = { id: string; methodId: string; pay: number };

/** What the band and its editor share; see `z-Payments.tsx`. */
export type PaymentsEditor = ReturnType<typeof usePayments>;

/**
 * The settlement as an editable list. The money band is where the payments are
 * read, so it is where they are corrected: `Pencil` puts the rows into fields,
 * `Batalkan` throws the draft away, `Simpan` writes it and lets the page's
 * revision re-read the record.
 *
 * The draft is local until Simpan, because a split is one fact: re-filing a
 * method while restating an amount must land together, or the rows and the
 * record's own `record_pay` disagree.
 */
export function usePayments(record: RecordFull) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PaymentDraft[]>(() => draftsOf(record));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A re-read (another edit, a settlement, a delete) replaces the record under
  // us. While the rows are fields the draft is the cashier's; outside edit mode
  // they follow the record.
  useEffect(() => {
    if (!editing) setDraft(draftsOf(record));
  }, [record, editing]);

  const paid = draft.reduce((sum, payment) => sum + payment.pay, 0);
  // Negative while the draft is short: the band says "Kurang" until it is not.
  const change = paid - record.grandTotal;
  const settled =
    paid === record.pay && samePayments(draft, draftsOf(record));

  function start() {
    setDraft(draftsOf(record));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function add(methodId: string = METHOD_BASE_ID.cash) {
    // A new row starts with whatever the rows above it do not cover — the split
    // a cashier is usually adding — and in cash unless told otherwise. Cash is
    // the one kind whose method id needs no catalogue to name.
    setDraft([
      ...draft,
      { id: generateId(), methodId, pay: Math.max(0, record.grandTotal - paid) },
    ]);
  }

  function remove(id: string) {
    setDraft(draft.filter((payment) => payment.id !== id));
  }

  function patch(id: string, values: Partial<Omit<PaymentDraft, "id">>) {
    setDraft(
      draft.map((payment) => (payment.id === id ? { ...payment, ...values } : payment)),
    );
  }

  async function save() {
    if (draft.length === 0) {
      setError("Minimal satu pembayaran");
      return;
    }
    // Underpaying is not a correction of this record — it is a credit, and
    // `Jadikan Kredit` is the write that records one. Say so here, before a
    // round trip, and let the service keep its own check for other callers.
    if (paid < record.grandTotal) {
      setError(
        `Pembayaran tidak cukup, minimal ${record.grandTotal.toLocaleString("id-ID")}`,
      );
      return;
    }
    // Restating the same rows would still bump `record_updated_at` and re-read
    // the page, so an untouched editor just closes.
    if (settled) {
      cancel();
      return;
    }
    setPending(true);
    const result = await Effect.runPromise(
      service.record.set
        .payment(
          record.id,
          draft.map((payment) => ({ methodId: payment.methodId, pay: payment.pay })),
        )
        .pipe(Effect.either),
    );
    setPending(false);
    Either.match(result, {
      onLeft: (failure) => setError(failure.message),
      onRight: () => {
        setError(null);
        setEditing(false);
      },
    });
  }

  return {
    editing,
    draft,
    error,
    pending,
    paid,
    change,
    start,
    cancel,
    add,
    remove,
    patch,
    save,
  } as const;
}

/** The record's payments, each keeping its own row id so a field stays put. */
function draftsOf(record: RecordFull): PaymentDraft[] {
  return record.methods.map((method) => ({
    id: method.id,
    methodId: method.methodId,
    pay: method.pay,
  }));
}

function samePayments(left: PaymentDraft[], right: PaymentDraft[]): boolean {
  return (
    left.length === right.length &&
    left.every((payment, index) => {
      const other = right[index];
      return other !== undefined && payment.methodId === other.methodId && payment.pay === other.pay;
    })
  );
}
