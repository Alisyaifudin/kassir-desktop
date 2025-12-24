import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

const schema = z.object({
  a: integer,
  b: integer,
});

export async function swapImageAction(formdata: FormData) {
  const parsed = schema.safeParse({
    a: formdata.get("a"),
    b: formdata.get("b"),
  });
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const { a, b } = parsed.data;
  const errMsg = await db.image.swap(a, b);
  return errMsg ?? undefined;
}
