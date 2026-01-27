import { getStore } from "./instance";
import { Effect } from "effect";

export function owner() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* store.get("owner");
    const owner = parseOwner(res);
    return owner;
  });
}

function parseOwner(owner: unknown) {
  if (typeof owner === "string" && owner.trim() !== "") {
    return owner;
  }
  return "Toko";
}
