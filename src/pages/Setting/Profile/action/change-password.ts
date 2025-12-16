import { z } from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";

export async function passwordAction(formdata: FormData) {
  const parsed = z.string().safeParse(formdata.get("password"));
  if (!parsed.success) {
    return parsed.error.message;
  }
  const password = parsed.data;
  const [errHash, hash] = await auth.hash(password);
  if (errHash) return errHash;
  const user = auth.user();
  const errMsg = await db.cashier.update.hash(user.name, hash);
  return errMsg ?? undefined;
}
