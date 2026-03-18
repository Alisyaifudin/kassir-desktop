import { useState } from "react";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { toast } from "sonner";
import { revalidateMoney } from "../use-data";

export function useUpdateName(id: number, nameInit: string) {
  const [name, setName] = useState(nameInit);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    if (name.trim() === "") {
      toast.error("Nama kantong tidak boleh kosong");
      return;
    }
    if (name.trim().length > 20) {
      toast.error("Nama kantong tidak boleh lebih dari 20 karakter");
      return;
    }
    const errMsg = await Effect.runPromise(program(id, name));
    setLoading(false);
    if (errMsg === null) {
      revalidate();
      revalidateMoney();
    } else {
      toast.error(errMsg);
    }
  }
  return { name, setName, loading, handleSubmit };
}

function program(id: number, name: string) {
  return db.money.update.name(id, name).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
