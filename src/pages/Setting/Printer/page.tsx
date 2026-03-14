// src/pages/Setting/Printer/page.tsx

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
// import { PrinterInfo, getPrinters, printReceipt } from "~/lib/printer-effect";

export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Pengaturan Printer</h1>
        <p className="text-muted-foreground text-normal">
          Konfigurasi printer untuk cetak struk
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="default-printer" className="text-normal font-semibold">
              Printer Default
            </Label>
            <p className="text-muted-foreground text-small">
              Pilih printer yang akan digunakan untuk mencetak struk
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="receipt-width" className="text-normal font-semibold">
              Lebar Struk (mm)
            </Label>
            <p className="text-muted-foreground text-small">
              Atur lebar kertas struk untuk printer thermal
            </p>
            <Input
              id="receipt-width"
              type="number"
              min={42}
              max={80}
              className="bg-background border-border mt-1"
            />
          </div>

          <Button className="mt-2">Test Cetak</Button>
        </div>
      </div>
    </div>
  );
}
