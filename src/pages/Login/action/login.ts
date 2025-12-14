import { redirect } from "react-router";
import { z } from "zod";
import { db } from "~/database";
import { auth, User } from "~/lib/auth";
import { log } from "~/lib/utils";

const newAccountSchema = z.object({
  name: z.string().min(1, { message: "Minimal satu karakter" }),
  password: z.string(),
});

export async function loginAction(formdata: FormData) {
  const parsed = newAccountSchema.safeParse({
    name: formdata.get("name"),
    password: formdata.get("password"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten();
    return errs.fieldErrors.password?.join("; ");
  }
  const { password, name } = parsed.data;
  const [errHash, usr] = await db.cashier.get.byName(name);
  if (errHash) {
    return errHash;
  }
  const verified = await auth.verify(password, usr.hash);
  switch (verified) {
    case "Aplikasi bermasalah":
    case "Kata sandi salah":
      return verified;
  }
  const user: User = { role: usr.role, name };
  auth.set(user);
  throw redirect("/setting");
}
