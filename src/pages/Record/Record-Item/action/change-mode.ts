import { z } from "zod";
import { db } from "~/database";

export async function changeModeAction(timestamp: number, formdata: FormData) {
  const parsed = z.enum(["sell", "buy"]).safeParse(formdata.get("mode"));
  if (!parsed.success) {
    const errs = parsed.error.flatten().formErrors;
    return {
      error: errs.join("; "),
    };
  }
  const mode = parsed.data;
  const errMsg = await db.record.update.mode(timestamp, mode);
  if (errMsg !== null) {
    return {
      error: errMsg,
    };
  }
  return {
    close: true,
  };
}
