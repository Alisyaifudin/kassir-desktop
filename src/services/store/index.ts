import { Context, Effect } from "effect";
import type { Info, InfoFull } from "../info";
import { StoreError } from "./error";
export { StoreError } from "./error";

export type StoreType = {
  info: {
    get: Effect.Effect<InfoFull, StoreError, never>;
    set: {
      info: (info: Info) => Effect.Effect<void, StoreError, never>;
      showCashier: (showCashier: boolean) => Effect.Effect<void, StoreError, never>;
    };
  };
};

export class StoreService extends Context.Tag("StoreService")<StoreService, StoreType>() {}
