import { Context, Effect } from "effect";
import { RecordFull } from "../record/type";
import { PrintError } from "./error";
import { Printer } from "./type";
import { AsyncDataState, Status } from "~/lib/state";

export class PrinterService extends Context.Tag("PrinterService")<
  PrinterService,
  {
    useLoad(): Status<PrintError>;
    testPrint(): Effect.Effect<void, PrintError>;
    print(record: RecordFull): Effect.Effect<void, PrintError>;
    size: AsyncDataState<number, string>;
    printer: AsyncDataState<Printer | null, string>;
    usePrinters(): Printer[];
  }
>() {}
