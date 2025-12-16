import { z } from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";

export async function newAction(formdata: FormData) {
  const parsed = z.string().safeParse(formdata.get("name"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const name = parsed.data;
  const [errMsg, hash] = await auth.hash("");
  if (errMsg) return errMsg;
  const errAdd = await db.cashier.add({ name, role: "user", hash });
  return errAdd ?? undefined;
}
