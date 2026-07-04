import { Context, Effect } from "effect";
import { RecordFull } from "../record/type";
import { PrintError } from "./error";
import { Printer } from "./type";

export class PrinterService extends Context.Tag("PrinterService")<
  PrinterService,
  {
    testPrint(): Effect.Effect<void, PrintError>;
    print(record: RecordFull): Effect.Effect<void, PrintError>;
    loader(): Effect.Effect<void, PrintError>;
    size: {
      useSize(): number;
      set(size: number): Effect.Effect<void, PrintError>;
    };
    printer: {
      usePrinter(): Printer | null;
      usePrinters(): Printer[];
      set(printer: Printer): Effect.Effect<void, PrintError>;
    };
  }
>() {}
