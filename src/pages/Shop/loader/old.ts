import { DefaultError, err, ok, Result } from "~/lib/utils";

type Discount = {
  id: number;
  value: number;
  kind: "pcs" | "number" | "percent";
};

export type ItemPromise = Promise<Result<DefaultError, Product[]>>;

export async function getItems(tab: number): ItemPromise {
  const [[errItem, rawItems], [errDisc, discs]] = await Promise.all([
    tx.item.get.byTx(tab),
    tx.discount.get.byTx(tab),
  ]);
  if (errItem) {
    return err(errItem);
  }
  if (errDisc) {
    return err(errDisc);
  }
  const items: Product[] = rawItems.map((item) => {
    const discounts = discs.filter((d) => d.item_id === item.id);
    let product: Product["product"] = undefined;
    if (item.product_id !== null && item.product_name !== null && item.product_price !== null) {
      product = {
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
      };
    }
    return {
      discounts,
      name: item.name,
      product,
      barcode: item.barcode,
      id: item.id,
      price: item.price,
      qty: item.qty,
      stock: item.stock,
      txId: item.tx_id,
    };
  });
  return ok(items);
}
