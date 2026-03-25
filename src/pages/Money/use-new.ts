import { useState } from "react";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { revalidateMoney } from "./use-data";
import { toast } from "sonner";

export function useNew(onClose: () => void) {
  const [name, setName] = useState("");
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    if (name.trim() === "") {
      toast.error("Nama kantong tidak boleh kosong");
      return;
    }
    if (name.trim().length > 20) {
      toast.error("Nama kantong tidak boleh lebih dari 20 karakter");
      return;
    }
    const errMsg = await Effect.runPromise(program(name));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidateMoney();
      onClose();
      setName("");
    }
  }
  return { name, setName, error, loading, handleSubmit };
}

function program(name: string) {
  return db.moneyKind.add.one(name).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
