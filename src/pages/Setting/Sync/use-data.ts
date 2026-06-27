import { Result } from "~/lib/result";
import { store } from "~/store";

const key = "sync-token";

export function useData() {
  const res = Result.use({
    fn: () => store.sync.token.get(),
    key,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(key);
}
