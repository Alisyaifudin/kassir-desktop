import { Context, Effect } from "effect";
import { BaseError } from "~/lib/error-effect";


type Info = {
  address: string;
  footer: string;
  header: string;
  name: string;
  showCashier: boolean;
};

export type StoreType = {
  info: {
    get: Effect.Effect<Info, StoreError, never>;
  };
};

export class StoreService extends Context.Tag("StoreService")<StoreService, StoreType>() {}

export class StoreError extends BaseError("StoreError") {}
