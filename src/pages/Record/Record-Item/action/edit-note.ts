import { z } from "zod";
import { db } from "~/database";

export async function editNoteAction(timestamp: number, formdata: FormData) {
  const parsed = z.string().safeParse(formdata.get("note"));
  if (!parsed.success) {
    const errs = parsed.error.flatten().formErrors;
    return {
      error: errs.join("; "),
      close: false,
    };
  }
  const note = parsed.data;
  const errMsg = await db.record.update.note(timestamp, note);
  if (errMsg !== null) {
    return { error: errMsg, close: false };
  }
  return { close: true };
}
