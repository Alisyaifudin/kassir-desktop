import { Effect } from "effect";
import { log } from "~/lib/log";
import { printPdf } from "~/lib/printer";
import { generatePdfBytes } from "~/lib/receipt";
import { ReceiptData } from "~/lib/receipt/type";
import { service } from "~/services";

/**
 * Prints a receipt. The shop's identity and the paper width are their own
 * services, so a caller hands over only what it knows — the record and its lines
 * — and gets back an error message, or `null` when the paper came out.
 */
export const programPrint = (data: Omit<ReceiptData, "info">) =>
  Effect.gen(function* () {
    const printer = yield* service.printer.get();
    const info = yield* service.info.info();
    const pdfBytes = yield* generatePdfBytes(
      {
        ...data,
        info,
      },
      {
        padding: 5,
        paperWidth: printer.width,
        size: {
          big: 10,
          normal: 8,
        },
      },
    );
    yield* printPdf(printer.name, pdfBytes);
    return null;
  }).pipe(
    Effect.catchAll((error) => {
      // `PdfDocError` is the odd one out — it carries the cause rather than a
      // message — and the cause is the half worth reporting.
      if ("e" in error) {
        log.error(error.e.message);
        return Effect.succeed(error.e.message);
      }
      log.error(error.message);
      return Effect.succeed(error.message);
    }),
  );
