import { redirect } from "react-router";
import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function delAction(formdata: FormData, href: string) {
  const parsed = integer.safeParse(formdata.get("timestamp"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const timestamp = parsed.data;
  const errMsg = await db.record.delByTimestamp(timestamp);
  if (errMsg !== null) {
    return errMsg;
  }
  const url = new URL(href);
  url.searchParams.delete("selected");
  throw redirect(url.href);
}

