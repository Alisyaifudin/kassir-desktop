import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import Decimal from "decimal.js";
import { ForEach } from "~/components/ForEach";
import { memo } from "react";
import { useFix } from "../../../use-transaction";
import { type Discount as Disc } from "../../../store/product";
import { Add } from "./Add";
import { DiscForm } from "./DiscForm";

export const Discount = memo(function Discount({
  id,
  discounts,
}: {
  id: string;
  discounts: Disc[];
}) {
  const fix = useFix();
  const discEff =
    discounts.length === 0 ? 0 : Decimal.sum(...discounts.map((d) => d.eff)).toNumber();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-[40px] w-full flex items-center justify-between px-2 gap-1 font-medium"
        >
          <span className="truncate">
            {discEff === 0 ? "Diskon" : Number(discEff.toFixed(fix)).toLocaleString("id-ID")}
          </span>
          <Plus className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Kelola Diskon</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-[1fr_110px_50px] gap-2 items-center font-semibold text-sm text-muted-foreground px-1">
            <span>Nilai</span>
            <span>Jenis</span>
            <span></span>
          </div>
          <div className="gap-2 grid items-center grid-cols-[1fr_110px_50px] max-h-[40vh] overflow-y-auto p-1">
            <ForEach items={discounts}>{(disc) => <DiscForm id={id} discount={disc} />}</ForEach>
          </div>
          <Add productId={id} />
        </div>
      </DialogContent>
    </Dialog>
  );
});
