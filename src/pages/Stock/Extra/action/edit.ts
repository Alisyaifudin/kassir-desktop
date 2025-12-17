import { redirect } from "react-router";
import { z } from "zod";
import { db } from "~/database";
import { integer, numeric } from "~/lib/utils";

const schema = z.object({
  id: integer,
  name: z.string().min(1, { message: "Harus ada" }),
  value: numeric,
  kind: z.enum(["number", "percent"]),
});

export async function editAction(formdata: FormData, backUrl: string) {
  const parsed = schema.safeParse({
    id: formdata.get("id"),
    name: formdata.get("name"),
    value: formdata.get("value"),
    kind: formdata.get("kind"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      name: errs.name?.join("; "),
      value: errs.value?.join("; "),
      kind: errs.kind?.join("; "),
    };
  }
  const { value: val, kind, name, id } = parsed.data;
  let value = val;
  if (kind === "percent") {
    if (value < -100) {
      return {
        value: "Tidak boleh kurang dari -100",
      };
    } else if (value > 100) {
      return {
        value: "Tidak boleh lebih dari 100",
      };
    }
  }
  const errMsg = await db.extra.update({ id, name, value, kind });
  if (errMsg) {
    return {
      global: errMsg,
    };
  }
  throw redirect(backUrl);
}
