import { cn } from "~/lib/utils";

export function HeaderColumn() {
  return (
    <div
      className={cn(
        "grid gap-1 outline grid-cols-[70px_1fr_155px_230px_70px_150px_65px] ",
        "small:grid-cols-[40px_1fr_105px_140px_40px_100px_45px]",
      )}
    >
      <span className="border-r">No</span>
      <span className="border-r">Nama</span>
      <span className="border-r">Harga</span>
      <span className="border-r">Diskon</span>
      <span className="border-r">Qty</span>
      <span>Subtotal</span>
      <div />
    </div>
  );
}
