import { Result } from "~/lib/result";
import { store } from "~/store";

const KEY = "store-info";

export function useData() {
  const res = Result.use({
    fn: () => store.info.get(),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
