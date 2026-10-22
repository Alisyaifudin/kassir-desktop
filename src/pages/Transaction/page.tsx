import Decimal from "decimal.js";
import { Either } from "effect";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { RecordAdjustmentInput, RecordMode } from "~/services/record";
import { Bottom } from "./z-Bottom";
import { Complete } from "./z-Complete";
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
 * saves. The lines are the shape an `Extra` has, so the record it writes is
 * flagged as an adjustment rather than a sale or purchase, and moves no stock.
 */
export default function Page() {
  const user = useUser();
  // Ids only have to be unique inside this screen; the record writer mints its own.
  const nextId = useRef(2);
  const [lines, setLines] = useState<ManualLine[]>([emptyLine("line-1")]);
  const [mode, setMode] = useState<RecordMode>("incoming");
  const [note, setNote] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [complete, setComplete] = useState<{ recordId: string; total: Decimal } | null>(null);
  // A finished record leaves a blank screen behind; bumping this remounts the
  // grid so it starts on an empty first line with the keyboard in it.
  const [generation, setGeneration] = useState(0);

  const total = lines.reduce((sum, line) => sum.add(line.value), new Decimal(0));
  const { pending, mutate } = useMutation((input: RecordAdjustmentInput) =>
    service.record.add.adjustment(input),
  );

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

  function reset() {
    nextId.current = 2;
    setLines([emptyLine("line-1")]);
    setNote("");
    setComplete(null);
    setGeneration((value) => value + 1);
  }

  async function submit() {
    if (methodId === null) return;
    const result = await mutate({
      mode,
      cashier: user.name,
      note,
      methodId,
      extras: lines.map((line) => ({ name: line.name, value: line.value })),
    });
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
      return;
    }
    setComplete({ recordId: result.right, total });
  }

  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <Lines key={generation} lines={lines} onAdd={add} onChange={patch} onRemove={remove} />
      <Bottom
        total={total}
        note={note}
        onNote={setNote}
        mode={mode}
        onMode={setMode}
        methodId={methodId}
        onMethod={setMethodId}
        pending={pending}
        onSubmit={() => void submit()}
      />
      {complete === null ? null : (
        <Complete recordId={complete.recordId} total={complete.total} onClose={reset} />
      )}
    </main>
  );
}
