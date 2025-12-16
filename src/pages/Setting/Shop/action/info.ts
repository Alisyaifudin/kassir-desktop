import { z } from "zod";
import { store } from "~/store";

const schema = z.object({
  owner: z.string(),
  header: z.string(),
  footer: z.string(),
  address: z.string(),
});

export async function action(formdata: FormData) {
  const parsed = schema.safeParse({
    owner: formdata.get("owner"),
    header: formdata.get("header"),
    footer: formdata.get("footer"),
    address: formdata.get("address"),
  });
  if (!parsed.success) {
    return parsed.error.message;
  }
  const data = parsed.data;
  const errMsg = await store.info.set.basic(data);
  return errMsg ?? undefined;
}
