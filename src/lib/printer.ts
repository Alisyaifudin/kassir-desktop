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
        : new InvokeError(new Error("Failed to get printers", { cause: e })),
  });
}

export function printPdf(printerName: string, pdfBytes: Uint8Array) {
  return Effect.tryPromise({
    try: () => invoke("print_pdf", { printerName, pdfBytes }),
    catch: (e) =>
      typeof e === "string"
        ? new InvokeError(new Error(e))
        : new InvokeError(new Error("Failed to print PDF", { cause: e })),
  });
}
