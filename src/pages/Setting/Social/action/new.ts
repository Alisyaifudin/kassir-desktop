import { z } from "zod";
import { db } from "~/database";

const schema = z.object({
  name: z.string().min(1, { message: "Harus ada" }),
  value: z.string().min(1, { message: "Harus ada" }),
});

export async function newAction(formdata: FormData) {
  const parsed = schema.safeParse({
    name: formdata.get("name"),
    value: formdata.get("value"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      name: errs.name?.join("; "),
      value: errs.value?.join("; "),
    };
  }
  const { name, value } = parsed.data;
  const errMsg = await db.social.add(name, value);
  if (errMsg !== null) {
    return {
      global: errMsg,
    };
  }
  return undefined;
}
