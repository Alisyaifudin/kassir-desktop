import { redirect } from "react-router";
import { db } from "~/database";

export async function deleteAction(id: number, backUrl: string) {
  const errMsg = await db.extra.delById(id);
  if (errMsg) {
    return errMsg;
  }
  throw redirect(backUrl);
}
