import { useSubtotal } from "../../store/product";
import { useFix } from "../../use-transaction";

export function Subtotal() {
  const subtotal = useSubtotal();
  const fix = useFix();
  return (
    <div className="self-end justify-between flex py-1 gap-2">
      <p>Subtotal:</p>
      <p className="font-bold">Rp{Number(subtotal.toFixed(fix)).toLocaleString("id-ID")}</p>
      <div className="w-[50px]" />
    </div>
  );
}
