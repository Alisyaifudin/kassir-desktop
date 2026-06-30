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
    id: string;
    createdAt: number;
    paidAt: number;
    rounding: number;
    creditAt?: number;
    cashier: string;
    mode: "in" | "out";
    pay: number;
    note: string;
    fix: number;
    subtotal: number;
    total: number;
    updatedAt: number;
    method: {
      id: string;
      name?: string;
      kind: "cash" | "transfer" | "debit" | "qris";
    };
    customer?: {
      id: string;
      name: string;
      phone: string;
    };
    products: {
      id: string;
      name: string;
      price: number;
      qty: number;
      capital: number;
      total: number;
      eventId?: string;
      discounts: {
        id: string;
        value: number;
        eff: number;
        kind: "percent" | "number" | "pcs";
      }[];
    }[];
    extras: {
      id: string;
      name: string;
      value: number;
      eff: number;
      kind: "number" | "percent";
    }[];
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
