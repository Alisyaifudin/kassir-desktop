import { z } from "zod";
import { db } from "~/database";

export async function deleteAction(formdata: FormData) {
  const parsed = z.string().min(1, { message: "Harus ada" }).safeParse(formdata.get("name"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const name = parsed.data;
  const errMsg = await db.cashier.delete(name);
  return errMsg ?? undefined;
}
