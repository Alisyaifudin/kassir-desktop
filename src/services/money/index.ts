import { MoneyError } from "./error";
import { Context, Effect } from "effect";
import { Money, MoneyImport } from "./type";
import type { PocketBase } from "../pocket/type";
import { DuplicateError, NotFoundError } from "~/lib/error-effect";

export class MoneyService extends Context.Tag("MoneyService")<
  MoneyService,
  {
    loader(
      pocketId: string,
      start: number,
      end: number,
    ): Effect.Effect<void, MoneyError | NotFoundError>;
    usePocket(): PocketBase;
    useMoney(start: number, end: number): Money[];
    all(pocketId: string): Effect.Effect<Money[], MoneyError | NotFoundError>;
    add: {
      local(args: {
        pocketId: string;
        value: number;
        type: DBNamespace.PocketType;
        note: string;
      }): Effect.Effect<void, MoneyError>;
      external(
        pocketId: string,
        record: MoneyImport,
      ): Effect.Effect<void, MoneyError | DuplicateError>;
    };
    delete(id: string): Effect.Effect<void, MoneyError>;
    set: {
      note(id: string, note: string): Effect.Effect<void, MoneyError>;
    };
  }
>() {}
