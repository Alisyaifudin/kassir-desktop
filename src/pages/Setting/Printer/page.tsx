// src/pages/Setting/Printer/page.tsx

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
// import { PrinterInfo, getPrinters, printReceipt } from "~/lib/printer-effect";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">Printer Settings</h2>

      <div>
        <Label htmlFor="default-printer">Default Printer</Label>
      </div>

      <div>
        <Label htmlFor="receipt-width">Receipt Width (mm)</Label>
        <Input
          id="receipt-width"
          type="number"
          min={42} // Typical minimum for thermal printers
          max={80} // Typical maximum for thermal printers
        />
      </div>

      <Button className="mt-4">Test Print</Button>
    </div>
  );
}
