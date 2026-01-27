import { Effect } from "effect";
import { db } from "~/database-effect";
import { store } from "~/store-effect";

export function loader() {
  const methods = Effect.all([db.method.getAll(), store.method.get()], {
    concurrency: "unbounded",
  });
  return methods;
}

export const KEY = "methods";
