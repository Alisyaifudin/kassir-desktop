import { Show } from "~/components/Show";
import { useSubtotal } from "../use-subtotal";

export function Subtotal() {
  const subtotal = useSubtotal();
  return (
    <div className="self-end justify-between flex py-1 gap-2">
      <p>Subtotal:</p>
      <Show value={subtotal}>
        {(subtotal) => <p className="font-bold">Rp{subtotal.toNumber().toLocaleString("id-ID")}</p>}
      </Show>
      <div className="w-[50px]" />
    </div>
  );
}
