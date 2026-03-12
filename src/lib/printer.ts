import { invoke } from "@tauri-apps/api/core";
import { Effect } from "effect";
import { InvokeError } from "./effect-error";

export interface PrinterInfo {
  name: string;
}

export function getPrinters(): Effect.Effect<PrinterInfo[], InvokeError> {
  return Effect.tryPromise({
    try: () => invoke<PrinterInfo[]>("get_printers"),
    catch: (e) => InvokeError.new(e, "Gagal mendapatkan daftar printer"),
  });
}

export function printReceipt(
  printerName: string,
  receiptData: string,
): Effect.Effect<string, InvokeError> {
  return Effect.tryPromise({
    try: () =>
      invoke<string>("print_receipt", {
        printerName,
        receiptData,
      }),
    catch: (e) => InvokeError.new(e, "Gagal mencetak struk"),
  });
}

type ReceiptData = {
  company: {
    name: string;
    description: string;
    address: string;
  },
  cashier: string;
  timestamp: number;
  items: {
    name: string;
    price: number;
    qty: number;
    
  }[]
}

export function formatReceiptData(): string {
  const companyName = "Maskeransay";
  const companyAddress = "Toko Kosmetik & Skincares";
  const streetAddress = "Jl. A.W. Syahranie No. 26, Seberang Kantor BPJS";
  const cashierName = "Ali";
  const transactionNo = "1766066062310";
  const dateTime = "2025/12/18, 21:54";

  const items = [
    { name: "G2G 2in1 Cushion 03", price: 150000, qty: 1 },
    { name: "Selsun Gold 120ml", price: 50000, qty: 1 },
    { name: "Ushas Blush 06", price: 27000, qty: 1 },
  ];

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const payment = total;
  const paymentMethod = "QRIS Mandiri";

  let receipt = "";

  // Header
  receipt += `${companyName.padStart(20 + companyName.length / 2)}\n`;
  receipt += `${companyAddress.padStart(20 + companyAddress.length / 2)}\n`;
  receipt += `${streetAddress.padStart(20 + streetAddress.length / 2)}\n`;
  receipt += `Kasir: ${cashierName}\n`;
  receipt += `No: ${transactionNo} ${dateTime.padStart(40 - `No: ${transactionNo}`.length)}\n`;
  receipt += "----------------------------------------\n";

  // Items
  items.forEach((item) => {
    const itemTotal = item.price * item.qty;
    receipt += `${item.name}\n`;
    receipt += `${item.price.toLocaleString("id-ID")} \u00D7 ${item.qty} ${itemTotal.toLocaleString("id-ID").padStart(40 - `${item.price.toLocaleString("id-ID")} \u00D7 ${item.qty}`.length)}\n`;
  });

  receipt += "----------------------------------------\n";

  // Totals
  receipt += `Total ${`Rp${total.toLocaleString("id-ID")}`.padStart(40 - "Total".length)}\n`;
  receipt += `Pembayaran ${`Rp${payment.toLocaleString("id-ID")}`.padStart(40 - "Pembayaran".length)}\n`;

  receipt += `\n`;
  receipt += `3 Jenis/${items.length} pcs ${paymentMethod.padStart(40 - `3 Jenis/${items.length} pcs`.length)}\n`;
  receipt += `\n`;

  // Footer
  receipt += `Terima kasih telah berbelanja di toko kami\n`;
  receipt += `Barang yang telah dibeli tidak dapat ditukar lagi\n`;
  receipt += `Ig: @maskeransay.smd\n`;
  receipt += `Shopee: @maskeransay.smd\n`;

  return receipt;
}
