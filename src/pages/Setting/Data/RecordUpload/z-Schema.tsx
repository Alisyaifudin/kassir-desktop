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
    products: {
      name: string;
      price: number;
      qty: number;
      capital: number;
      capitalRaw: number;
      total: number;
      discounts: {
        kind: "percent" | "number" | "pcs";
        value: number;
        eff: number;
      }[]; 
    }[];
    extras: {
      name: string;
      value: number;
      eff: number;
      kind: "percent" | "number";
    }[];
    paidAt: number;
    rounding: number;
    isCredit: boolean;
    cashier: string;
    mode: "buy" | "sell";
    pay: number;
    note: string;
    method: {
        name?: string;
        kind: "cash" | "transfer" | "debit" | "qris";
    };
    fix: number;
    customer: {
        name: string;
        phone: string;
    };
    subTotal: number;
    total: number;
}[]`;

export function SchemaDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <HelpCircle className="w-4 h-4" />
          <span className="sr-only">Lihat format data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-big">Format data</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="text-small!">File JSON harus mengikuti bentuk data berikut:</p>
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
