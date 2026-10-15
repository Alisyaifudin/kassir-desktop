import { Effect, Stream } from "effect";
import { useQuery, useStream, type Result } from "~/components/Loader";
import { getPrinters } from "~/lib/printer";
import type { InvokeError } from "~/lib/effect-error";
import { service } from "~/services";
import type { Printer, PrinterError } from "~/services/printer";

/** The printer the app prints to, and the names the system offers. */
export function useData(): {
  printer: Result<Printer, PrinterError>;
  printers: Result<string[], InvokeError>;
} {
  return {
    printer: useStream(service.printer.changes),
    // Hardware only changes when someone plugs something in, so the system's
    // list is read once instead of subscribed to.
    printers: useQuery(
      () => Stream.fromEffect(getPrinters().pipe(Effect.map((list) => list.map((it) => it.name)))),
      [],
    ),
  };
}
