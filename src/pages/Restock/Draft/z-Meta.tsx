import { User, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Show } from "~/components/Show";
import { Note } from "./z-Note";
import { SupplierDialog } from "../Supplier/z-Dialog";
import { CASHIER, DRAFT, PRECISION } from "../mock";

/**
 * Who this purchase is for and from, plus the precision the money is expressed
 * in. Sits directly under the lines, above the total, because that is the order
 * the operator reads it in before paying.
 */
export function Meta() {
  return (
    <div className="flex items-center justify-between gap-3 border-t px-2 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <p className="shrink-0 text-end select-none">Kasir: {CASHIER}</p>
        <Note />
        <SupplierDialog />
        <SupplierChip />
      </div>
      <Precision />
    </div>
  );
}

/** The chosen supplier, dismissable without opening the dialog again. */
function SupplierChip() {
  return (
    <Show when={DRAFT.supplier !== null}>
      <div className="flex items-center gap-2">
        <p className="truncate text-normal select-none">
          <User className="mr-1 inline align-middle text-muted-foreground icon" />
          {DRAFT.supplier?.name}
        </p>
        <Button variant="destructive" className="rounded-full p-1" type="button" title="Lepas">
          <X className="icon" />
        </Button>
      </div>
    </Show>
  );
}

/** How many decimals the money is shown with. Nothing here rounds for you. */
function Precision() {
  return (
    <div className="z-10 shrink-0">
      <Label htmlFor="precision" className="flex items-center gap-2 pr-1 select-none">
        Presisi
        <Select defaultValue={PRECISION.toString()}>
          <SelectTrigger id="precision" className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[50px]">
            <SelectGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {i}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        belakang koma
      </Label>
    </div>
  );
}
