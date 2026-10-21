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

const productSchema = `{
    name: string;            // wajib diisi
    note: string;
    listings: {
        name: string;
        price: number;       // >= 0 (boleh 0 untuk bonus)
        unit: number;        // pcs per listing unit, bilangan bulat >= 1
        kind: string;        // e.g. "retail", "wholesale"
        code: string | null; // tidak boleh sama dalam satu produk
        codeKind: "barcode" | "qr" | null;
    }[];                     // minimal satu
    stocks: {
        value: number;       // pcs, >= 0
        capital: number;     // modal per pc, >= 0
    }[];                     // minimal satu
    properties: { key: string; value: string }[];
}[]`;

export function SchemaDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <HelpCircle className="icon" />
          <span className="sr-only">Lihat format data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-big">Format data</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="text-small!">File JSON harus mengikuti bentuk data berikut:</p>
              <pre className="overflow-x-auto rounded-md border border-input bg-muted/50 p-4 text-small text-foreground">
                <code>{productSchema}</code>
              </pre>
              <p className="text-small!">
                Angka negatif ditolak: harga, jumlah stok dan modal tidak boleh kurang dari nol,
                dan satu kode tidak boleh dipakai dua kali. Baris yang salah dilaporkan sebelum
                data disimpan.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
