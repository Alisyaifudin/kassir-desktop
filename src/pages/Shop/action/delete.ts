import { redirect } from "react-router";
import { integer } from "~/lib/utils";
import { tx } from "~/transaction";

export async function deleteAction(formdata: FormData) {
  const parsed = integer.safeParse(formdata.get("tab"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const tab = parsed.data;
  const errMsg = await tx.transaction.del(tab);
  if (errMsg !== null) {
    return errMsg;
  }
  throw redirect("/");
}
