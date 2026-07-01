import { MoneyError } from "./error";
import { Context } from "effect";
import { Money, Pocket } from "./type";

export class PrinterService extends Context.Tag("PrinterService")<
  PrinterService,
  {
    pocket: {
      loader(): Promise<MoneyError>;
      use(): Pocket[];
      set: {
        ordering(pocketIds: string[]): void;
        name(id: string, name: string): Promise<string | null>;
        type(id: string, type: DBNamespace.PocketType): Promise<string | null>;
      };
      add(name: string): Promise<string | null>;
      delete(id: string): Promise<string | null>;
    };
    money: {
      loader(): Promise<MoneyError>;
      use(pocketId: string): {
        pocket: { id: string; name: string; type: DBNamespace.PocketType };
        money: Money[];
      };
      delete(id: string): Promise<string | null>;
      add(args: {
        pocketId: string;
        value: number;
        type: DBNamespace.PocketType;
        note: string;
      }): Promise<string | null>;
      set: {
        note(id: string, note: string): Promise<string | null>;
      };
    };
  }
>() {}
