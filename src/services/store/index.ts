import { Context, Effect } from "effect";
import { StoreError } from "~/lib/error-effect";

type Size = "big" | "small";

type Info = {
  address: string;
  footer: string;
  header: string;
  name: string;
  showCashier: boolean;
};

export type StoreType = {
  size: {
    get: Effect.Effect<Size, StoreError, never>;
  };
  info: {
    get: Effect.Effect<Info, StoreError, never>;
  };
};

export class StoreService extends Context.Tag("StoreService")<StoreService, StoreType>() {}
