import { Product as ProductDB } from "~/database/product/caches";
import { Product } from "../../Right/Product/use-products";
import { err, ok, Result } from "~/lib/utils";

type Input = {
  isCredit: boolean;
  pay: number;
  tab: number;
  rounding: number;
  products: Product[];
  all: ProductDB[];
  cashier: string;
};
export function submitHandler({
  isCredit,
  pay,
  tab,
  rounding,
  products,
  all,
  cashier,
}: Input): Result<{ id: string; message: string }[], FormData> {
  const errors: { id: string; message: string }[] = [];
  for (const p of products) {
    const dupStock = all.findIndex(
      (a) => a.barcode === p.barcode.trim() && p.product === undefined
    );
    if (dupStock !== -1) {
      errors.push({ id: p.id, message: `Barang dengan kode ini sudah ada di stok` });
      continue;
    }
    if (p.barcode.trim() === "") continue;
    const rest = products.filter((p) => p.id !== p.id);
    const dup = rest.find((r) => r.barcode === p.barcode);
    if (dup !== undefined) {
      errors.push({ id: p.id, message: `Duplikat kode dengan ${dup.name}` });
    }
  }
  if (errors.length > 0) {
    return err(errors);
  }
  const formdata = new FormData();
  console.log("pay", pay);
  formdata.set("pay", pay.toString());
  formdata.set("rounding", rounding.toString());
  formdata.set("tab", tab.toString());
  formdata.set("is-credit", isCredit.toString());
  formdata.set("cashier", cashier);
  formdata.set("action", "submit");
  return ok(formdata);
}
