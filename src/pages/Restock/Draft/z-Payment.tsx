import type { ReactNode } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { METHODS, PAYMENT } from "../mock";
import { rupiah } from "../util-rupiah";

/**
 * Stage three: settling the purchase. Method first, then the money — what is
 * rounded, what is handed over, and what comes back.
 */
export function Payment() {
  const change = PAYMENT.change;
  const hasSubMethods = PAYMENT.kind === "transfer" || PAYMENT.kind === "debit";
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-2 scroll-gutter">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label className="select-none">Metode</Label>
          <div className="flex items-center gap-3">
            <Select defaultValue={PAYMENT.kind}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {METHODS.map((method) => (
                    <SelectItem key={method.kind} value={method.kind}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {hasSubMethods && (
              <Select defaultValue="none">
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="--Pilih--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">--Pilih--</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Row label="Pembulatan">
            <Input type="number" step="any" defaultValue={PAYMENT.rounding} aria-autocomplete="list" />
          </Row>
          <Row label="Bayar">
            <Input
              type="number"
              id="paid-input"
              defaultValue={PAYMENT.paid}
              className="text-right"
              aria-autocomplete="list"
            />
          </Row>
          <Row label="Kembalian">
            <span
              className={cn(
                "px-1 text-change tabular-nums select-none",
                change < 0 && "bg-destructive text-primary-foreground",
              )}
            >
              {rupiah(change)}
            </span>
          </Row>
        </form>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[170px_10px_1fr] items-center small:grid-cols-[120px_10px_1fr]">
      <span className="select-none">{label}</span>:
      <span className="min-w-0">{children}</span>
    </label>
  );
}
