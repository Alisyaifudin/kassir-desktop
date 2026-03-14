import { invoke } from "@tauri-apps/api/core";
import { Effect } from "effect";
import { InvokeError } from "./effect-error";

export interface PrinterInfo {
  name: string;
}

export interface ReceiptItem {
  name: string;
  price: string;
  quantity: number;
  total: string;
}

export interface ReceiptData {
  store_name: string;
  store_description: string;
  store_address: string;
  cashier: string;
  order_no: string;
  date_time: string;
  items: ReceiptItem[];
  total_amount: string;
  payment_amount: string;
  summary_text: string;
  payment_method: string;
  footer_messages: string[];
  socials: string[];
}

export function getPrinters(): Effect.Effect<PrinterInfo[], InvokeError> {
  return Effect.tryPromise({
    try: () => invoke<PrinterInfo[]>("get_printers"),
    catch: (e) => InvokeError.new(e, "Gagal mendapatkan daftar printer"),
  });
}

export function printReceipt(
  printerName: string,
  data: ReceiptData,
  widthMm: number = 80,
): Effect.Effect<string, InvokeError> {
  return Effect.tryPromise({
    try: () =>
      invoke<string>("print_receipt", {
        printerName,
        data,
        widthMm,
      }),
    catch: (e) => InvokeError.new(e, "Gagal mencetak struk"),
  });
}

export function getSampleReceiptData(): ReceiptData {
  return {
    store_name: "Maskeransay",
    store_description: "Toko Kosmetik & Skincares",
    store_address: "Jl. A.W. Syahranie No. 26, Seberang Kantor BPJS",
    cashier: "Ali",
    order_no: "1766066062310",
    date_time: "2025/12/18, 21:54",
    items: [
      { name: "G2G 2in1 Cushion 03", price: "150.000", quantity: 1, total: "150.000" },
      { name: "Selsun Gold 120ml", price: "50.000", quantity: 1, total: "50.000" },
      { name: "Ushas Blush 06", price: "27.000", quantity: 1, total: "27.000" },
    ],
    total_amount: "227.000",
    payment_amount: "227.000",
    summary_text: "3 Jenis/3 pcs",
    payment_method: "QRIS Mandiri",
    footer_messages: [
      "Terima kasih telah berbelanja di toko kami",
      "Barang yang telah dibeli tidak dapat ditukar lagi",
    ],
    socials: ["Ig: @maskeransay.smd", "Shopee: @maskeransay.smd"],
  };
}
