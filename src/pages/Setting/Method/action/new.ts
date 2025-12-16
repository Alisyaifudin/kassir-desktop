import { z } from "zod";
import { db } from "~/database";

const schema = z.object({
  name: z.string().min(1, { message: "Harus ada" }),
  kind: z.enum(["transfer", "qris", "debit"]),
});

export async function newAction(formdata: FormData) {
  const parsed = schema.safeParse({
    name: formdata.get("name"),
    kind: formdata.get("kind"),
  });
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const { name, kind } = parsed.data;
  const errMsg = await db.method.add(name, kind);
  return errMsg ?? undefined;
}
