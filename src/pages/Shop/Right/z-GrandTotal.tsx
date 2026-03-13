import { useTotal } from "../store/extra";
import { useFix, useRounding } from "../use-transaction";

export function GrandTotal() {
  const total = useTotal();
  const rounding = useRounding();
  const fix = useFix();
  const grandTotal = total.plus(rounding.num);
  return (
    <div className="relative z-0 flex flex-col pb-[36px] small:pb-[25px]">
      <p className="text-center text-grand-total">
        Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
      </p>
    </div>
  );
}
