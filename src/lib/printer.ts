import { Effect } from "effect";
import { InvokeError } from "./effect-error";
import { invoke } from "@tauri-apps/api/core";

type PrinterInfo = {
  name: string;
};

export function getPrinters() {
  return Effect.tryPromise({
    try: () => invoke<PrinterInfo[]>("get_printers"),
    catch: (e) =>
      typeof e === "string"
        ? new InvokeError(new Error(e))
        : new InvokeError(new Error("Gagal membaca daftar printer", { cause: e })),
  });
}

/**
 * Send the bytes to the spooler. Resolves with the cashier-facing sentence the
 * command returns ("Dikirim ke printer 'X'. Periksa printer …"), which is what
 * the test-print screen shows: the spooler accepting a job is not the same as
 * paper coming out, and that distinction is the only useful feedback.
 */
export function printPdf(printerName: string, pdfBytes: Uint8Array) {
  return Effect.tryPromise({
    try: () => invoke<string>("print_pdf", { printerName, pdfBytes }),
    catch: (e) =>
      typeof e === "string"
        ? new InvokeError(new Error(e))
        : new InvokeError(new Error("Gagal mencetak struk", { cause: e })),
  });
}
