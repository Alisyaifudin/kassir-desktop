import { HelpCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

const recordSchema = `{
    paidAt: number;               // ms since epoch
    rounding: number;
    isCredit: boolean;
    cashier: string;
    mode: "incoming" | "outcoming";  // incoming = sale, outcoming = purchase
    pay: number;
    note: string;
    fix: number;
    customer: { name: string; phone: string };
    supplier?: { id: string | null; name: string };
    subTotal: number;
    total: number;
    methods: { methodId: string; pay: number }[];
    listings: {
      listingId: string | null;      // catalog listing, or null for a manual line
      name: string;
      kind: string;
      price: number;
      qty: number;
      capital: number;
      total: number;
      discounts: { kind: "number" | "percent" | "pcs"; value: number; eff: number }[];
      portions?: {                   // the per-lot split; absent in old files
        unit: number;                // pcs per listing unit
        qty: number;                 // listing units this lot supplied
        capital: number;             // per listing unit
        total: number;
        event: {                     // the stock journal row it wrote
          id: string;
          createdAt: number;         // ms since epoch
          value: number;             // signed pcs delta
          capital: number;           // per pcs
          note: string;
          productId: string;
          stockId: string | null;    // the lot that moved
        } | null;                    // null = moved no stock
      }[];
    }[];
    extras: { name: string; value: number; eff: number; kind: "number" | "percent" }[];
}[]`;

export function SchemaDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <HelpCircle className="size-5" />
          <span className="sr-only">Lihat format data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl">Format data</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm">File JSON harus mengikuti bentuk data berikut:</p>
              <p className="text-sm text-muted-foreground">
                Berkas yang diunduh dari aplikasi ini membawa <code>portions</code> beserta
                pergerakan stoknya, sehingga stok ikut dipulihkan saat diunggah. Berkas lama
                tanpa <code>portions</code> tetap diterima dan ditulis sebagai baris manual.
              </p>
              <pre className="max-h-[60vh] overflow-auto rounded-md border border-input bg-muted/50 p-4 text-sm text-foreground">
                <code className="block whitespace-pre">{recordSchema}</code>
              </pre>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
