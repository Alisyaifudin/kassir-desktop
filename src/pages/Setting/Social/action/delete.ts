import { db } from "~/database";
import { numeric } from "~/lib/utils";

export async function deleteAction(formdata: FormData) {
  const parsed = numeric.safeParse(formdata.get("id"));
  if (!parsed.success) {
    const errs = parsed.error.flatten().formErrors.join("; ");
    return errs;
  }
  const id = parsed.data;
  const errMsg = await db.social.delById(id);
  return errMsg ?? undefined;
}
