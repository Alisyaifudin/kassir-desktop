import { store } from "~/store";
import { server } from "~/server";
import { makePull } from "../util";

export const pull = makePull({
  storeGet: () => store.sync.method.get(),
  serverGet: (token, ts, cb) => server.method.get(token, ts, cb),
});
