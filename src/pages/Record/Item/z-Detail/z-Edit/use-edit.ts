import { Effect, Either } from "effect";
import { useEffect, useState } from "react";
import { useStream } from "~/components/Loader";
import { service } from "~/services";
import type { Method } from "~/services/method";
import type { RecordFull } from "~/services/record";
import { programSaveEdit } from "./program-save-edit";

/** One payment row as the dialog edits it: a method and what it paid. */
export type MethodRow = { methodId: string; pay: string };

export type MethodRowState = {
  rows: MethodRow[];
  addRow: () => void;
  removeRow: (index: number) => void;
  setRow: (index: number, row: Partial<MethodRow>) => void;
};

/**
 * The record's payments, editable as rows. One row is the common case (a record
 * is normally paid one way); several is a split payment, which the store keeps as
 * `record_methods` and `record_pay` as their sum.
 */
function methodRowsFromRecord(record: RecordFull): MethodRow[] {
  return record.methods.length === 0
    ? [{ methodId: "", pay: String(record.pay) }]
    : record.methods.map((method) => ({ methodId: method.methodId, pay: String(method.pay) }));
}

export function useMethodRows(record: RecordFull, open: boolean): MethodRowState {
  const [rows, setRows] = useState<MethodRow[]>(() => methodRowsFromRecord(record));

  // Reopen on the latest service snapshot; a cancelled draft should not become
  // the starting point for the next edit.
  useEffect(() => {
    if (open) setRows(methodRowsFromRecord(record));
  }, [open, record]);

  return {
    rows,
    addRow: () => setRows((current) => [...current, { methodId: "", pay: "0" }]),
    removeRow: (index) => setRows((current) => current.filter((_, at) => at !== index)),
    setRow: (index, patch) =>
      setRows((current) =>
        current.map((row, at) => (at === index ? { ...row, ...patch } : row)),
      ),
  };
}

/** The payment methods, as the store holds them. */
export function useMethods() {
  return useStream(service.method.get.changes);
}

/** One group per kind: the kind's base method first, then its named variants. */
export function groupMethods(methods: Method[]) {
  const byKind = new Map<Method["kind"], Method[]>();
  for (const method of methods) {
    const group = byKind.get(method.kind) ?? [];
    group.push(method);
    byKind.set(method.kind, group);
  }
  return Array.from(byKind.entries()).map(([kind, group]) => ({
    kind,
    base: group.find((method) => method.name === null) ?? null,
    variants: group.filter((method) => method.name !== null),
  }));
}

/** The record's edits, applied in one go when the dialog is saved. */
export function useSaveEdit(record: RecordFull, onSaved: () => void, open: boolean) {
  const [note, setNote] = useState(record.note);
  const [mode, setMode] = useState(record.mode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const methodRows = useMethodRows(record, open);

  useEffect(() => {
    if (!open) return;
    setNote(record.note);
    setMode(record.mode);
    setError(null);
  }, [open, record]);

  /** What the rows add up to, which becomes the record's `pay`. */
  const paid = methodRows.rows
    .filter((row) => row.methodId !== "")
    .reduce((total, row) => total + (Number(row.pay) || 0), 0);

  // A record that was paid outright has to cover its own total; a credit one has
  // nothing to cover yet (`payCredit` is what settles it).
  const shortfall = record.isCredit ? 0 : record.grandTotal - paid;

  async function save() {
    const rows = methodRows.rows
      .filter((row) => row.methodId !== "")
      .map((row) => ({ methodId: row.methodId, pay: Number(row.pay) }));
    if (rows.some((row) => !Number.isFinite(row.pay) || row.pay < 0)) {
      setError("Jumlah pembayaran tidak valid");
      return;
    }
    if (rows.length === 0) {
      setError("Metode pembayaran harus diisi");
      return;
    }
    if (shortfall > 0) {
      setError(`Pembayaran tidak cukup, minimal Rp${record.grandTotal.toLocaleString("id-ID")}`);
      return;
    }

    setLoading(true);
    const either = await Effect.runPromise(
      programSaveEdit({
        id: record.id,
        originalMode: record.mode,
        mode,
        originalNote: record.note,
        note,
        methods: rows,
      }).pipe(Effect.either),
    );
    setLoading(false);
    Either.match(either, {
      onLeft: (failure) => setError(failure.message),
      onRight: () => {
        setError(null);
        onSaved();
      },
    });
  }

  return { note, setNote, mode, setMode, error, loading, save, paid, shortfall, ...methodRows };
}
