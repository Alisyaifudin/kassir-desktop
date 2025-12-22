import { z } from "zod";
import { integer } from "~/lib/utils";
import { store } from "~/store";

export async function updateDefaultAction(formdata: FormData) {
  const parsed = z
    .object({
      kind: z.enum(["transfer", "debit", "qris"]),
      id: z.nullable(integer),
    })
    .safeParse({
      kind: formdata.get("kind"),
      id: formdata.get("id"),
    });
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const { id, kind } = parsed.data;
  const errMsg = await store.method.set(kind, id ?? undefined);
  return errMsg ?? undefined;
}
