import { Effect } from "effect";
import { getStore } from "~/store/instance";


function get() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* store.get("token");
    const token = parseString(res);
    return token;
  });
}

function parseString(token: unknown) {
  if (typeof token === "string") {
    const str = token.trim();
    if (str === "") return undefined;
    return str;
  }
  return undefined;
}

function set(token: string) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set("token", token);
  });
}

export const token = {
  get,
  set,
};