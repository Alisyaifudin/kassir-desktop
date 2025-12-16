import { store } from "~/store";

export async function action(formdata: FormData) {
  const checked = formdata.get("check") === "true";
  const errMsg = await store.info.set.showCashier(checked);
  return errMsg ?? undefined;
}
