import { redirect } from "react-router";
import { z } from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";
import { log } from "~/lib/utils";

const newAccountSchema = z.object({
  name: z.string().min(1, { message: "Minimal satu karakter" }),
  password: z.string(),
  confirm: z.string(),
});

export async function freshAction(formdata: FormData) {
  const parsed = newAccountSchema.safeParse({
    name: formdata.get("name"),
    password: formdata.get("password"),
    confirm: formdata.get("confirmed"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten();
    return {
      name: errs.fieldErrors.name?.join("; "),
      password: errs.fieldErrors.password?.join("; "),
      confirm: errs.fieldErrors.confirm?.join("; "),
    };
  }
  const { password, name, confirm } = parsed.data;
  if (password !== confirm) {
    return { confirm: "Kata sandi tidak sesuai" };
  }
  const [errHash, hash] = await auth.hash(password);
  if (errHash) {
    return { global: errHash };
  }
  const errAuth = await db.cashier.add({ name, role: "admin", hash });
  if (errAuth) {
    log.error("Gagal menyimpan di database");
    return { global: "Gagal menyimpan di database" };
  }
  auth.set({
    name,
    role: "admin",
  });
  throw redirect("/setting");
}
