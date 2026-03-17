import { Effect } from "effect";
import { log } from "~/lib/log";
import { printPdf } from "~/lib/printer";
import { generatePdfBytes } from "~/lib/receipt";
import { ReceiptData } from "~/lib/receipt/type";
import { store } from "~/store";

export const programPrint = (data: Omit<ReceiptData, "info">) =>
  Effect.gen(function* () {
    const printer = yield* store.printer.get();
    const info = yield* store.info.get();
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
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
