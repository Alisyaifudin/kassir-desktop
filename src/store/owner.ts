import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getStore } from "./instance";

export async function owner(): Promise<Result<DefaultError, string>> {
  const store = await getStore();
  const [errMsg, res] = await tryResult({
    run: () => store.get("owner"),
  });
  if (errMsg) return err(errMsg);
  const owner = parseOwner(res);
  return ok(owner);
}

function parseOwner(owner: unknown) {
  if (typeof owner === "string" && owner.trim() !== "") {
    return owner;
  }
  return "Toko";
}
