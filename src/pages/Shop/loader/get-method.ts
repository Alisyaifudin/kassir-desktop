import { db } from "~/database";
import { Method as Meth } from "~/database/method/get-all";
import { DefaultError, err, ok, Result } from "~/lib/utils";
import { store } from "~/store";

export type Method = {
  isDefault: boolean;
} & Meth;

export async function getMethod(): Promise<Result<DefaultError, Method[]>> {
  const [[errMeth, methods], [errDef, defMeth]] = await Promise.all([
    db.method.getAll(),
    store.method.get(),
  ]);
  if (errMeth !== null) return err(errMeth);
  if (errDef !== null) return err(errDef);
  return ok(
    methods.map((m) => {
      if (m.kind === "cash") return { ...m, isDefault: true };
      const defVal = defMeth[m.kind];
      const method = { ...m, isDefault: m.id === defVal };
      return method;
    })
  );
  // already force to have at least one tab
}
