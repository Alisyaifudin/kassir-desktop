import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getStore } from "./instance";

export type Size = "big" | "small";

export async function size(): Promise<Result<DefaultError, Size>> {
  const store = await getStore();
  const [errMsg, res] = await tryResult({
    run: () => store.get("size"),
  });
  if (errMsg) return err(errMsg);
  const size = parseSize(res);
  return ok(size);
}

function parseSize(size: unknown): Size {
  if (size === "big" || size === "small") {
    return size;
  }
  return "big";
}
