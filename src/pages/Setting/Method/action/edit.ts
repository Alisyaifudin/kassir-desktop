import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

const schema = z.object({
  name: z.string().min(1, { message: "Harus ada" }),
  id: integer,
});

export async function editAction(formdata: FormData) {
  const parsed = schema.safeParse({
    name: formdata.get("name"),
    id: formdata.get("id"),
  });
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const { name, id } = parsed.data;
  const errMsg = await db.method.update(id, name);
  return errMsg ?? undefined;
}
