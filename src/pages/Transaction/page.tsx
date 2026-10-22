import Decimal from "decimal.js";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { RecordMode } from "~/services/record";
import { Bottom } from "./z-Bottom";
import { Lines } from "./z-Lines";

/** One hand-typed line: an `Extra` of kind `number`, in name-and-amount form. */
export type ManualLine = {
  id: string;
  name: string;
  value: number;
};

function emptyLine(id: string): ManualLine {
  return { id, name: "", value: 0 };
}

/**
 * `/transaction` — an arbitrary record, typed by hand.
 *
 * Much simpler than Pos on purpose: no catalog, no search, no stages, no
 * precision, no customer. The operator writes down what happened as lines of
 * name + amount, chooses whether it was money in or out, picks one method and
 * saves. The lines are the shape an `Extra` has, so the record it will write is
 * the same kind of row as a charge on a sale.
 */
export default function Page() {
  // Ids only have to be unique inside this screen; the record writer mints its own.
  const nextId = useRef(2);
  const [lines, setLines] = useState<ManualLine[]>([emptyLine("line-1")]);
  const [mode, setMode] = useState<RecordMode>("incoming");
  const [note, setNote] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);

  const total = lines.reduce((sum, line) => sum.add(line.value), new Decimal(0));

  function add() {
    const id = `line-${nextId.current++}`;
    setLines((current) => [...current, emptyLine(id)]);
  }

  function patch(id: string, next: Partial<ManualLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...next } : line)));
  }

  function remove(id: string) {
    setLines((current) =>
      // The grid always keeps one line to type into.
      current.length === 1 ? [emptyLine(current[0]!.id)] : current.filter((line) => line.id !== id),
    );
  }

  function submit() {
    // Mock: the shape is settled, the write is not.
    toast("Simpan masih tiruan", {
      description: "Transaksi ini belum disimpan ke database.",
    });
  }

  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <Lines lines={lines} onAdd={add} onChange={patch} onRemove={remove} />
      <Bottom
        total={total}
        note={note}
        onNote={setNote}
        mode={mode}
        onMode={setMode}
        methodId={methodId}
        onMethod={setMethodId}
        onSubmit={submit}
      />
    </main>
  );
}
