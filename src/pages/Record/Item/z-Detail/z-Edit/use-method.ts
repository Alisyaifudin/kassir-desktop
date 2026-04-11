import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { recordMap, revalidate } from "../../use-data";
import { METHOD_BASE_ID } from "~/lib/constants";
import type { Method } from "~/database/method/cache";

export function useMethod({
  recordId,
  method,
  methods,
  onClose,
}: {
  recordId: string;
  method: Method;
  onClose: () => void;
  methods: Method[];
}) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(method);
  async function handleChangeOption(kind: string) {
    if (kind !== "cash" && kind !== "debit" && kind !== "transfer" && kind !== "qris") return;
    const id = METHOD_BASE_ID[kind];
    setSelected({ id, kind });
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId, id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      if (kind === "cash") onClose();
      recordMap.delete(recordId);
      revalidate();
    } else {
      setSelected(selected);
    }
  }
  async function handleChangeSuboption(id: string) {
    const method = methods.find((m) => m.id === id);
    if (method === undefined) return;
    setSelected(method);
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId, id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      recordMap.delete(recordId);
      revalidate();
    } else {
      setSelected(selected);
    }
  }
  return { loading, error, selected, handleChangeOption, handleChangeSuboption };
}

function program(recordId: string, methodId: string) {
  return db.record.update.method(recordId, methodId).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
