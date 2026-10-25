import { Effect, Context, Data, Stream } from "effect";

export class PrinterError extends Data.TaggedError("PrinterError")<{ message: string }> {}

/**
 * The thermal printer receipts are sent to. `name` is the system printer name
 * (empty until one is chosen); `width` is the paper width in mm, which decides
 * how the receipt PDF is laid out.
 */
export type Printer = {
  name: string;
  width: number;
};

export class PrinterService extends Context.Tag("PrinterService")<
  PrinterService,
  {
    get: () => Effect.Effect<Printer, PrinterError>;
    set: (printer: Printer) => Effect.Effect<void, PrinterError>;
    changes: Stream.Stream<Printer, PrinterError>;
  }
>() {}
