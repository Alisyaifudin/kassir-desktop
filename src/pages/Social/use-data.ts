import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "socials";

export function useData() {
  const res = Result.use({
    fn: () => db.social.get.all(),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
