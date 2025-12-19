import { db } from "~/database";
import { integer, METHOD_BASE_ID } from "~/lib/utils";

export async function changeMethodAction(timestamp: number, formdata: FormData) {
  const parsed = integer.safeParse(formdata.get("method-id"));
  if (!parsed.success) {
    const errs = parsed.error.flatten().formErrors;
    return { error: errs.join("; ") };
  }
  const methodId = parsed.data;
  const errMsg = await db.record.update.method(timestamp, methodId);
  if (errMsg) {
    return { error: errMsg };
  }
  if (Object.values(METHOD_BASE_ID).includes(methodId as any)) {
    return { close: false };
  }
  return { close: true };
}
