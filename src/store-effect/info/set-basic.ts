import { Effect } from "effect";
import { getStore } from "../instance";

export function setBasic({
  address,
  header,
  footer,
  owner,
}: {
  address: string;
  header: string;
  footer: string;
  owner: string;
}) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* Effect.all(
      [
        store.set("address", address),
        store.set("header", header),
        store.set("footer", footer),
        store.set("owner", owner),
      ],
      { concurrency: "unbounded" },
    );
  });
}
