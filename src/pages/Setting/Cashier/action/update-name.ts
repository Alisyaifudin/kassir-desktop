import { z } from "zod";
import { db } from "~/database";

export async function updateNameAction(formdata: FormData) {
  const parsed = z
    .object({
      oldName: z.string().min(1, { message: "Harus ada" }),
      newName: z.string().min(1, { message: "Harus ada" }),
    })
    .safeParse({
      oldName: formdata.get("old-data"),
      newName: formdata.get("new-data"),
    });
  if (!parsed.success) {
    return parsed.error.flatten().fieldErrors.newName?.join("; ");
  }
  const { oldName, newName } = parsed.data;
  const errMsg = await db.cashier.update.name({ old: oldName, new: newName });
  return errMsg ?? undefined;
}
