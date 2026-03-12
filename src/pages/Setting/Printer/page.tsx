// src/pages/Setting/Printer/page.tsx

import { useState, useEffect } from "react";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { PrinterInfo, getPrinters, printReceipt } from "~/lib/printer-effect";
import { store } from "~/store";
import { toast } from "sonner";

export default function PrinterSettingsPage() {
  const [availablePrinters, setAvailablePrinters] = useState<PrinterInfo[]>([]);
  const { defaultPrinter, receiptWidth, setDefaultPrinter, setReceiptWidth } = store.printer();

  useEffect(() => {
    const fetchPrinters = async () => {
      const printers = await getPrinters();
      setAvailablePrinters(printers);
      if (printers.length > 0 && !defaultPrinter) {
        // Optionally set the first printer as default if none is selected
        setDefaultPrinter(printers[0].name);
      }
    };
    fetchPrinters();
  }, [defaultPrinter, setDefaultPrinter]);

  const handleTestPrint = async () => {
    if (!defaultPrinter) {
      toast.error("Please select a default printer first.");
      return;
    }

    const testReceiptData = `
      TEST RECEIPT
      --------------
      Item 1         1 x 10.00
      Item 2         2 x 5.00
      Tax (10%)          2.00
      --------------
      TOTAL             22.00
      Width: ${receiptWidth}mm
      Date: ${new Date().toLocaleDateString()}
      Time: ${new Date().toLocaleTimeString()}
    `;

    try {
      const message = await printReceipt(defaultPrinter, testReceiptData);
      toast.success(message);
    } catch (error) {
      toast.error(`Test print failed: ${error.message || error}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">Printer Settings</h2>

      <div>
        <Label htmlFor="default-printer">Default Printer</Label>
        <Select value={defaultPrinter || ""} onValueChange={(value) => setDefaultPrinter(value)}>
          <SelectTrigger id="default-printer">
            <SelectValue placeholder="Select a printer" />
          </SelectTrigger>
          <SelectContent>
            {availablePrinters.map((printer) => (
              <SelectItem key={printer.name} value={printer.name}>
                {printer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="receipt-width">Receipt Width (mm)</Label>
        <Input
          id="receipt-width"
          type="number"
          value={receiptWidth}
          onChange={(e) => setReceiptWidth(Number(e.target.value))}
          min={42} // Typical minimum for thermal printers
          max={80} // Typical maximum for thermal printers
        />
      </div>

      <Button onClick={handleTestPrint} className="mt-4">
        Test Print
      </Button>
    </div>
  );
}
