import { useSubtotal } from "../../store/product";
import { useFix } from "../../use-transaction";

export function Subtotal() {
  const subtotal = useSubtotal();
  const fix = useFix();
  return (
    <div className="self-end justify-between flex py-1 gap-2">
      <span className="font-bold text-big">Subtotal:</span>
      <span className="font-bold text-big">Rp{Number(subtotal.toFixed(fix)).toLocaleString("id-ID")}</span>
    </div>
  );
}
