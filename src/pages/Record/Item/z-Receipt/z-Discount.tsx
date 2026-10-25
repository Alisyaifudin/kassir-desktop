import type { Discount } from "~/services/record";

export function Discount({ discount, fix }: { discount: Discount; fix: number }) {
  const amount = `(-${Number(discount.eff.toFixed(fix)).toLocaleString("id-ID")})`;
  switch (discount.kind) {
    case "number":
      return <p>{amount}</p>;
    case "percent":
      return <div className="flex justify-between"><p>(Diskon {discount.value}%)</p><p>{amount}</p></div>;
    case "pcs":
      return <div className="flex justify-between"><p>(Diskon {discount.value}pcs)</p><p>{amount}</p></div>;
  }
}
