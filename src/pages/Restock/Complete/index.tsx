import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Summary } from "./z-Summary";
import { Actions } from "./z-Actions";
import { PAYMENT, TOTALS } from "../mock";

/**
 * The settled purchase. It owns the Bayar button as its trigger — see
 * Checkout/z-Payment.tsx — so the button that settles the draft and the dialog
 * that reports the settlement are the same component and cannot disagree.
 */
export function Complete() {
  return (
    <Dialog>
      <Button asChild className="flex-1">
        <DialogTrigger type="button">Bayar</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="text-center">
          <DialogTitle className="mb-4 w-full text-center text-big font-bold">
            Pembelian Tercatat
          </DialogTitle>
        </DialogHeader>

        <Summary total={TOTALS.total} change={PAYMENT.change} />

        <Actions />
      </DialogContent>
    </Dialog>
  );
}
