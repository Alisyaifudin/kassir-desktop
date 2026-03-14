import { db } from "~/database";
import { store } from "~/store";
import { Result } from "~/lib/result";
import { Effect } from "effect";
import { Social } from "~/database/social/get-all";

const KEY = "receipt-info";

export type Info = {
  address: string;
  footer: string;
  header: string;
  owner: string;
  showCashier: boolean;
  socials: Social[];
};

export function useInfo() {
  const res = Result.use({
    fn: loader,
    key: KEY,
  });
  return res;
}

export function revalidateInfo() {
  Result.revalidate(KEY);
}

function loader() {
  return Effect.gen(function* () {
    const [info, socials] = yield* Effect.all([store.info.get(), db.social.getAll()], {
      concurrency: "unbounded",
    });

    const res: Info = {
      ...info,
      socials,
    };
    return res;
  });
}
