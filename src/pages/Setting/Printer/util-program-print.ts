import { Cause, Effect } from "effect";
import { log } from "~/lib/log";
import { printReceipt, type ReceiptInput } from "~/lib/printer";
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
 *
 * The receipt is laid out and rendered to PDF by `print_receipt` in Rust; this
 * side only collects the inputs. That is also why there is no dynamic `import()`
 * left: the ~2 MB `pdf-lib` bundle the webview used to fetch on the first print
 * is gone.
 */
export const programPrint = (
  data: Omit<ReceiptInput, "info">,
): Effect.Effect<PrintOutcome> =>
  Effect.gen(function* () {
    const printer = yield* service.printer.get();
    const info = yield* service.info.info();
    const message = yield* printReceipt(
      printer.name,
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
    return { ok: true, message } as const;
  }).pipe(
    Effect.catchAll((error) => {
      log.error(error.message);
      return Effect.succeed({ ok: false, message: error.message } as const);
    }),
    // A defect (an unexpected throw while collecting the inputs) must not escape
    // the print dialog: report it like any other print failure so the caller
    // always gets a message and can leave its loading state.
    Effect.catchAllCause((cause) => {
      log.error(Cause.pretty(cause));
      return Effect.succeed({ ok: false, message: "Gagal mencetak struk" } as const);
    }),
  );
