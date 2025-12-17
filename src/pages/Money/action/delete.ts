import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function deleteAction(formdata: FormData) {
  const parsed = integer.safeParse(formdata.get("timestamp"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const timestamp = parsed.data;
  const errMsg = await db.money.delByTimestamp(timestamp);
  return errMsg ?? undefined;
}
