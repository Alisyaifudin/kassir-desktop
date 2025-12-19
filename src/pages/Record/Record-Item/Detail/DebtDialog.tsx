import { memo, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { Form } from "react-router";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useLoading } from "~/hooks/use-loading";
import Decimal from "decimal.js";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";

export const DebtDialog = memo(function ({ grandTotal }: { grandTotal: number }) {
  const [open, setOpen] = useState(false);
  const [mount, setMount] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("pay-credit");
  const [pay, setPay] = useState("");
  const [rounding, setRounding] = useState("");
  const [total, change] = calc(grandTotal, pay, rounding);
  useEffect(() => {
    if (mount && error === undefined && !loading) {
      setOpen(false);
    }
    setMount(true);
  }, [loading, error]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button variant="destructive" asChild className="w-fit">
        <DialogTrigger>Bayar Kredit</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Bayar Kredit</DialogTitle>
        </DialogHeader>
        <Form method="POST" className="flex flex-col gap-1">
          <input type="hidden" name="action" value="pay-credit"></input>
          <input type="hidden" name="grand-total" value={grandTotal}></input>
          <label className="grid grid-cols-[100px_1fr] items-center gap-5">
            Bayaran
            <Input
              value={pay}
              onChange={(e) => setPay(e.currentTarget.value)}
              type="number"
              name="pay"
              className="w-[200px]"
              aria-autocomplete="list"
            />
          </label>
          <TextError>{error?.pay}</TextError>
          <label className="grid grid-cols-[100px_1fr] items-center gap-5">
            Pembulatan
            <Input
              value={rounding}
              onChange={(e) => setRounding(e.currentTarget.value)}
              type="number"
              name="rounding"
              className="w-[200px]"
              aria-autocomplete="list"
            />
            <TextError>{error?.rounding}</TextError>
          </label>
          <div className="grid grid-cols-[100px_1fr]">
            <p>Total</p>
            <p className="pl-4">: Rp{total.toNumber().toLocaleString("id-ID")}</p>
          </div>
          <div className="grid grid-cols-[100px_1fr]">
            <p>Kembalian</p>
            <p className={cn("pl-4", { "text-red-500": change.toNumber() < 0 })}>
              : Rp{change.toNumber().toLocaleString("id-ID")}
            </p>
          </div>
          <TextError>{error?.global}</TextError>
          <Button>
            Bayar <Spinner when={loading} />
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

function calc(grandTotal: number, payRaw: string, roundingRaw: string) {
  const rounding = new Decimal(roundingRaw || 0);
  const pay = new Decimal(payRaw || 0);
  const total = rounding.plus(grandTotal);
  const change = pay.minus(total);
  return [total, change] as const;
}
