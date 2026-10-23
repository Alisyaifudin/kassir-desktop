import { Effect } from "effect";
import { createPageData } from "~/components/page-data";
import type { InvokeError } from "~/lib/effect-error";
import { getPrinters } from "~/lib/printer";
import type { Printer, PrinterError } from "~/services/printer";

/**
 * Pengaturan → Printer.
 *
 * Two keys, because the two reads answer different questions and the fields need
 * different halves of them:
 *
 * - `printer` — the stored name and paper width (a live stream; a write here or
 *   on another screen reaches both fields).
 * - `printers` — the names the system offers (read once: hardware changes when
 *   someone plugs something in, not while the page is open).
 */
export type PrinterData = {
  printer: Printer;
  printers: string[];
};

export const pageData = createPageData<PrinterData, PrinterError | InvokeError>("PrinterPage");

/** The system's printer names, read once. */
export const printersSource = getPrinters().pipe(Effect.map((list) => list.map((it) => it.name)));
