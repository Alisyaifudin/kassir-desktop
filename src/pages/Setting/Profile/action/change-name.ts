import { z } from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";

export async function nameAction(formdata: FormData) {
  const parsed = z.string().safeParse(formdata.get("name"));
  if (!parsed.success) {
    return parsed.error.message;
  }
  const name = parsed.data;
  const user = auth.user();
  const errMsg = await db.cashier.update.name({ old: user.name, new: name });
  if (errMsg) {
    return errMsg;
  }
  const updated = { ...user, name };
  auth.set(updated);
  return errMsg ?? undefined;
}
