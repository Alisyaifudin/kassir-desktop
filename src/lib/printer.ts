import { Effect } from "effect";
import { InvokeError } from "./effect-error";
import { invoke } from "@tauri-apps/api/core";
import type { Info } from "~/services/info";
import type { Record, RecordExtra, RecordListing } from "~/services/record";
import type { Social } from "~/services/social";

type PrinterInfo = {
  name: string;
};

/**
 * Everything a receipt is drawn from. The layout and the PDF are built in Rust
 * (`src-tauri/src/receipt`), so this is also the whole payload of `print_receipt`
 * — no `pdf-lib`, no font bytes and no 2 MB library in the webview.
 */
export type ReceiptInput = {
  record: Record;
  products: RecordListing[];
  extras: RecordExtra[];
  info: Info;
  socials: Social[];
};

/**
 * How the 58/80 mm roll is laid out. Mirrors `ReceiptOption` in Rust: `paperWidth`
 * is millimetres, `padding` and both font sizes are points.
 */
export type ReceiptOption = {
  paperWidth: number;
  padding: number;
  size: {
    normal: number;
    big: number;
  };
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
 * Send a receipt's data to the spooler. Resolves with the cashier-facing sentence
 * the command returns ("Dikirim ke printer 'X'. Periksa printer …"), which is what
 * the test-print screen shows: the spooler accepting a job is not the same as
 * paper coming out, and that distinction is the only useful feedback.
 *
 * The PDF is never returned to this side — rendering it in Rust is the whole
 * point, and shipping ~20 KB back over IPC only to hand it straight back would
 * give that up for nothing.
 */
export function printReceipt(
  printerName: string,
  data: ReceiptInput,
  option: ReceiptOption,
) {
  return Effect.tryPromise({
    try: () => invoke<string>("print_receipt", { printerName, data, option }),
    catch: (e) =>
      typeof e === "string"
        ? new InvokeError(new Error(e))
        : new InvokeError(new Error("Gagal mencetak struk", { cause: e })),
  });
}
