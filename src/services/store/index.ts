import { Context, Effect } from "effect";
import { StoreError } from "~/store/error";
import { Size } from "~/store/size/get";

export type StoreType = {
  size: {
    get: () => Effect.Effect<Size, StoreError, never>;
  };
};

export class StoreService extends Context.Tag("StoreService")<StoreService, StoreType>() {}
