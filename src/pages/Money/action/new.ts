import Decimal from "decimal.js";
import { z } from "zod";
import { db } from "~/database";
import { log, numeric } from "~/lib/utils";

const schema = z.object({
  type: z.enum(["change", "absolute"]),
  kind: z.enum(["diff", "debt", "saving"]),
  value: z.string(),
  note: z.string(),
});

export async function newAction(formdata: FormData) {
  const parsed = schema.safeParse({
    type: formdata.get("type"),
    value: formdata.get("value"),
    note: formdata.get("note"),
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
  const { type, kind, note } = parsed.data;
  const value = parsedVal.data;
  if (value > 1e12) {
    return "Nilai tidak mungkin lebih dari 1 triliun. Serius?";
  }
  if (value < -1e12) {
    return "Nilai tidak mungkin kurang dari -1 triliun. Serius?";
  }
  switch (type) {
    case "absolute":
      return handleAbs(value, kind, note);
    case "change":
      return handleChange(value, kind, note);
    default:
      throw new Error(`Invalid type: ${type}`);
  }
}

async function handleAbs(value: number, kind: "diff" | "saving" | "debt", note: string) {
  // TODO: apakah perlu cek nilai absolut minus untuk `saving` dan `debt`???
  // if (value < 0 && kind !== "diff") {
  // 	return "Nilai tidak boleh kurang dari nol";
  // }
  const errMsg = await db.money.add(value, kind, note);
  return errMsg ?? undefined;
}

async function handleChange(value: number, kind: "diff" | "saving" | "debt", note: string) {
  const [errMoney, money] = await db.money.get.last(Date.now(), kind);
  if (errMoney !== null) {
    return errMoney;
  }
  let val = value;
  if (money !== null) {
    val = new Decimal(money.value).plus(value).toNumber();
  }
  const errMsg = await db.money.add(val, kind, note);
  return errMsg ?? undefined;
}
