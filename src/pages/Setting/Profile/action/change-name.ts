import { z } from "zod";
import { auth } from "~/lib/auth";
import { SubAction } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function nameAction({ context, formdata }: SubAction) {
  const parsed = z.string().safeParse(formdata.get("name"));
  if (!parsed.success) {
    return parsed.error.message;
  }
  const name = parsed.data;
  const user = await getUser(context);
  const { db, store } = getContext(context);
  const errUpdate = await db.cashier.update.name(user.name, name);
  if (errUpdate) {
    return errUpdate;
  }
  const updated = { ...user, name };
  const errMsg = await auth.genToken(store, updated);
  return errMsg ?? undefined;
}
