import { redirect } from "react-router";
import { tx } from "~/transaction";

export async function newAction() {
  const [errMsg, tab] = await tx.transaction.addNew();
  if (errMsg !== null) {
    return errMsg;
  }
  throw redirect(`/?tab=${tab}`);
}
