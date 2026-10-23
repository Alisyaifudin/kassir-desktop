import { Cause, Effect } from "effect";
import { log } from "~/lib/log";
import { printPdf } from "~/lib/printer";
import { ReceiptData } from "~/lib/receipt/type";
import { service } from "~/services";

/**
 * What a print attempt did. `message` is cashier-facing either way: the error on
 * failure, the printer command's "Dikirim ke printer …" sentence on success —
 * which used to be discarded, so "Tes Cetak" had no success state at all.
 */
export type PrintOutcome = { ok: true; message: string } | { ok: false; message: string };

/**
 * Prints a receipt. The shop's identity and the paper width are their own
 * services, so a caller hands over only what it knows — the record and its lines
 * — and gets back the outcome.
 */
export const programPrint = (
  data: Omit<ReceiptData, "info">,
): Effect.Effect<PrintOutcome> =>
  Effect.gen(function* () {
    const printer = yield* service.printer.get();
    const info = yield* service.info.info();
    // `pdf-lib` is the heaviest thing in the app (~2 MB) and a test print is a
    // deliberate act, so the receipt module is fetched when the button is
    // pressed — not when the settings screen opens, and never for the app's
    // first paint.
    const { generatePdfBytes } = yield* Effect.promise(() => import("~/lib/receipt"));
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
    const message = yield* printPdf(printer.name, pdfBytes);
    return { ok: true, message } as const;
  }).pipe(
    Effect.catchAll((error) => {
      // `PdfDocError` is the odd one out — it carries the cause rather than a
      // message — and the cause is the half worth reporting.
      if ("e" in error) {
        log.error(error.e.message);
        return Effect.succeed({ ok: false, message: error.e.message } as const);
      }
      log.error(error.message);
      return Effect.succeed({ ok: false, message: error.message } as const);
    }),
    // A defect (an unexpected synchronous throw inside the receipt/PDF pipeline)
    // must not escape the print dialog: report it like any other print failure so
    // the caller always gets a message and can leave its loading state.
    Effect.catchAllCause((cause) => {
      log.error(Cause.pretty(cause));
      return Effect.succeed({ ok: false, message: "Gagal mencetak struk" } as const);
    }),
  );
