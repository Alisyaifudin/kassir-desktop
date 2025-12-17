import { ActionFunctionArgs, redirect } from "react-router";
import { z } from "zod";
import { db } from "~/database";
import { auth } from "~/lib/auth";
import { numeric } from "~/lib/utils";

const schema = z.object({
  name: z.string().min(1, { message: "Harus ada" }),
  value: numeric,
  kind: z.enum(["percent", "number"]),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = auth.user();
  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const formdata = await request.formData();
  const parsed = schema.safeParse({
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
  const { value: val, kind, name } = parsed.data;
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
  const errMsg = await db.extra.add({ name, value, kind });
  if (errMsg) {
    return {
      global: errMsg,
    };
  }
  throw redirect(`/stock?tab=extra`);
}

export type Action = typeof action;
