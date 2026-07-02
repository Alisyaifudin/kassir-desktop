import { MoneyError } from "./error";
import { Context, Effect } from "effect";
import { Money, MoneyImport, PocketBase, PocketFull } from "./type";
import { DuplicateError, NotFoundError } from "~/lib/error-effect";

export class MoneyService extends Context.Tag("MoneyService")<
  MoneyService,
  {
    pocket: {
      loader(): Promise<MoneyError | null>;
      usePockets(): PocketFull[];
      set: {
        // Must update usePockets() optimistically for instant DnD feedback
        ordering(pocketIds: string[]): void;
        name(id: string, name: string): Promise<string | null>;
        type(id: string, type: DBNamespace.PocketType): Promise<string | null>;
      };
      add(name: string): Promise<string | null>;
      delete(id: string): Promise<string | null>;
    };
    money: {
      all(pocketId: string): Effect.Effect<Money[], MoneyError | NotFoundError>;
      loader(
        pocketId: string,
        start: number,
        end: number,
      ): Promise<MoneyError | NotFoundError | null>;
      usePocket(): PocketBase;
      useMoney(start: number, end: number): Money[];
      delete(id: string): Promise<string | null>;
      add: {
        one(args: {
          pocketId: string;
          value: number;
          type: DBNamespace.PocketType;
          note: string;
        }): Promise<string | null>;
        external(
          pocketId: string,
          record: MoneyImport,
        ): Promise<MoneyError | DuplicateError | null>;
      };
      set: {
        note(id: string, note: string): Promise<string | null>;
      };
    };
  }
>() {}
