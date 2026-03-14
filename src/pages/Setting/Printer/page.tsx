// src/pages/Setting/Printer/page.tsx

import { useState, useEffect } from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { getPrinters, printReceipt, getSampleReceiptData, PrinterInfo } from "~/lib/printer";
import { Effect } from "effect";
import { toast } from "sonner";

export default function Page() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [receiptWidth, setReceiptWidth] = useState<number>(80);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Load saved settings
    const savedPrinter = localStorage.getItem("default-printer");
    const savedWidth = localStorage.getItem("receipt-width");

    if (savedPrinter) setSelectedPrinter(savedPrinter);
    if (savedWidth) setReceiptWidth(Number(savedWidth));

    // Fetch available printers
    Effect.runPromise(getPrinters())
      .then((result) => {
        setPrinters(result);
      })
      .catch((err) => {
        console.error("Failed to fetch printers:", err);
        toast.error("Gagal mendapatkan daftar printer");
      });
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("default-printer", selectedPrinter);
    localStorage.setItem("receipt-width", receiptWidth.toString());
    toast.success("Pengaturan printer disimpan");
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      toast.error("Pilih printer terlebih dahulu");
      return;
    }

    setIsLoading(true);
    const sampleData = getSampleReceiptData();

    try {
      await Effect.runPromise(printReceipt(selectedPrinter, sampleData, receiptWidth));
      toast.success("Test print berhasil dikirim");
    } catch (err) {
      console.error("Test print failed:", err);
      toast.error("Test print gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Printer Settings</h2>
        <p className="text-muted-foreground">Konfigurasi printer thermal untuk struk belanja</p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="default-printer">Default Printer</Label>
          <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
            <SelectTrigger id="default-printer">
              <SelectValue placeholder="Pilih printer..." />
            </SelectTrigger>
            <SelectContent>
              {printers.length === 0 ? (
                <SelectItem value="none" disabled>
                  Tidak ada printer ditemukan
                </SelectItem>
              ) : (
                printers.map((printer) => (
                  <SelectItem key={printer.name} value={printer.name}>
                    {printer.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="receipt-width">Receipt Width (mm)</Label>
          <Input
            id="receipt-width"
            type="number"
            min={42}
            max={80}
            value={receiptWidth}
            onChange={(e) => setReceiptWidth(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Standard: 80mm atau 58mm</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSaveSettings}>Save Settings</Button>
          <Button variant="outline" onClick={handleTestPrint} disabled={isLoading}>
            {isLoading ? "Printing..." : "Test Print"}
          </Button>
        </div>
      </div>
    </div>
  );
}
