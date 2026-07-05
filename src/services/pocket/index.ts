import { Effect } from "effect";
import { Context } from "effect";
import { PocketFull } from "./type";
import { PocketError } from "./error";

export class PocketService extends Context.Tag("PocketService")<
  PocketService,
  {
    loader(): Effect.Effect<void, PocketError>;
    usePockets(): PocketFull[];
    add(name: string): Effect.Effect<void, PocketError>;
    delete(id: string): Effect.Effect<void, PocketError>;
    set: {
      name(id: string, name: string): Effect.Effect<void, PocketError>;
      type(id: string, type: DBNamespace.PocketType): Effect.Effect<void, PocketError>;
      ordering(pocketIds: string[]): Effect.Effect<void, PocketError>;
    };
  }
>() {}
