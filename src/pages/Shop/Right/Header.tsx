import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { useSize } from "~/hooks/use-size";

export function Header() {
  const size = useSize();
  return (
    <div className={cn("grid gap-1 outline", css.header[size])}>
      <p className="border-r">No</p>
      <p className="border-r">Nama</p>
      <p className="border-r">Harga</p>
      <p className="border-r">Diskon</p>
      <p className="border-r">Qty</p>
      <p>Subtotal</p>
      <div />
    </div>
  );
}
