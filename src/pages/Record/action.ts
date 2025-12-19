import { ActionFunctionArgs, redirect } from "react-router";
import { db } from "~/database";
import { auth } from "~/lib/auth";
import { integer } from "~/lib/utils";

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const parsed = integer.safeParse(formdata.get("timestamp"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const timestamp = parsed.data;
  const errMsg = await db.record.delByTimestamp(timestamp);
  if (errMsg !== null) {
    return errMsg;
  }
  const url = new URL(request.url);
  url.searchParams.delete("selected");
  throw redirect(url.href);
}

export type Action = typeof action;
