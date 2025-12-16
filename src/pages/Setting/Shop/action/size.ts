import { z } from "zod";
import { sizeStore } from "~/layouts/root/Provider";
import { tryResult } from "~/lib/utils";
import { store } from "~/store";

export async function action(formdata: FormData) {
  const parsed = z.enum(["big", "small"]).safeParse(formdata.get("size"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const size = parsed.data;
  const [errMsg] = await tryResult({
    run: () => store.size.set(size),
  });
  sizeStore.set(size);
  return errMsg ?? undefined;
}
