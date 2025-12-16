import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function deleteAction(formdata: FormData) {
  const parsed = integer.safeParse(formdata.get("id"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const id = parsed.data;
  const errMsg = await db.customer.delById(id);
  return errMsg ?? undefined;
}
