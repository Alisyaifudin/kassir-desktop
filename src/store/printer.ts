// src/store/printer.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface PrinterStore {
  defaultPrinter: string | null;
  receiptWidth: number; // e.g., 58 or 80 (mm)
  setDefaultPrinter: (printerName: string | null) => void;
  setReceiptWidth: (width: number) => void;
}

export const usePrinterStore = create<PrinterStore>()(
  persist(
    (set) => ({
      defaultPrinter: null,
      receiptWidth: 80, // Default to 80mm
      setDefaultPrinter: (printerName) => set({ defaultPrinter: printerName }),
      setReceiptWidth: (width) => set({ receiptWidth: width }),
    }),
    {
      name: "printer-storage", // unique name
      storage: createJSONStorage(() => localStorage), // use localStorage for persistence
    },
  ),
);
