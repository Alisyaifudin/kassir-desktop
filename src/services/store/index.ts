import { Context, Effect } from "effect";
import type { Info, InfoFull } from "../info";
import { StoreError } from "./error";
export { StoreError } from "./error";

export type StoreType = {
  info: {
    get: Effect.Effect<InfoFull, StoreError, never>;
    set: {
      info: (info: Info) => Promise<StoreError | null>;
      showCashier: (showCashier: boolean) => Promise<StoreError | null>;
    };
  };
};

export class StoreService extends Context.Tag("StoreService")<StoreService, StoreType>() {}
