import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "../../use-data";
import { METHOD_BASE_ID } from "~/lib/constants";
import { MethodFull } from "~/database-effect/method/get-all";

export function useMethod({
  timestamp,
  method,
  methods,
  onClose,
}: {
  timestamp: number;
  method: MethodFull;
  onClose: () => void;
  methods: MethodFull[];
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(method);
  async function handleChangeOption(kind: string) {
    if (kind !== "cash" && kind !== "debit" && kind !== "transfer" && kind !== "qris") return;
    const id = METHOD_BASE_ID[kind];
    setSelected({ id, kind });
    setLoading(true);
    const errMsg = await Effect.runPromise(program(timestamp, id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      if (kind === "cash") onClose();
      revalidate();
    } else {
      setSelected(selected);
    }
  }
  async function handleChangeSuboption(v: string) {
    const id = Number(v);
    if (isNaN(id) || !isFinite(id)) return;
    const method = methods.find((m) => m.id === id);
    if (method === undefined) return;
    setSelected(method);
    setLoading(true);
    const errMsg = await Effect.runPromise(program(timestamp, id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    } else {
      setSelected(selected);
    }
  }
  return { loading, error, selected, handleChangeOption, handleChangeSuboption };
}

function program(timestamp: number, methodId: number) {
  return db.record.update.method(timestamp, methodId).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
