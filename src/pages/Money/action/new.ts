import { z } from "zod";
import { Database } from "~/database/old";
import { log, numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
  type: z.enum(["change", "absolute"]),
  kind: z.enum(["diff", "debt", "saving"]),
  value: z.string(),
});

export async function newAction({ formdata, context }: SubAction) {
  const parsed = schema.safeParse({
    type: formdata.get("type"),
    value: formdata.get("value"),
    kind: formdata.get("kind"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().formErrors.join("; ");
    log.error(errs);
    return errs;
  }
  let val = parsed.data.value;
  val = val.replaceAll(".", "");
  val = val.replace(",", ".");
  const parsedVal = numeric.safeParse(val);
  if (!parsedVal.success) {
    const errs = parsedVal.error.flatten().formErrors.join("; ");
    log.error(errs);
    return errs;
  }
  const { type, kind } = parsed.data;
  const value = parsedVal.data;
  if (value > 1e12) {
    return "Nilai tidak mungkin lebih dari 1 triliun. Serius?";
  }
  if (value < -1e12) {
    return "Nilai tidak mungkin kurang dari -1 triliun. Serius?";
  }
  const { db } = getContext(context);
  switch (type) {
    case "absolute":
      return handleAbs(value, kind, db);
    case "change":
      return handleChange(value, kind, db);
    default:
      throw new Error(`Invalid type: ${type}`);
  }
}

async function handleAbs(value: number, kind: "diff" | "saving" | "debt", db: Database) {
  // TODO: apakah perlu cek nilai absolut minus untuk `saving` dan `debt`???
  // if (value < 0 && kind !== "diff") {
  // 	return "Nilai tidak boleh kurang dari nol";
  // }
  const errMsg = await db.money.add.abs(value, kind);
  return errMsg ?? undefined;
}

async function handleChange(value: number, kind: "diff" | "saving" | "debt", db: Database) {
  const errMsg = await db.money.add.change(value, kind);
  return errMsg ?? undefined;
}
