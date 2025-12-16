import { z } from "zod";
import { db } from "~/database";

const schema = z.object({
  name: z.string().min(1, { message: "Harus ada" }),
  phone: z
    .string()
    .min(1, { message: "Harus adaj" })
    .refine((val) => val !== "" || !isNaN(Number(val)), {
      message: "Harus angka",
    }),
});

export async function newAction(formdata: FormData) {
  const parsed = schema.safeParse({
    name: formdata.get("name"),
    phone: formdata.get("phone"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      name: errs.name?.join("; "),
      phone: errs.phone?.join("; "),
    };
  }
  const { name, phone } = parsed.data;
  const errMsg = await db.customer.add(name, phone);
  if (errMsg !== null) {
    return { global: errMsg };
  }
  return undefined;
}
