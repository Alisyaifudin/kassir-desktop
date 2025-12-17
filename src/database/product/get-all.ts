import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getCache, Product, setCache } from "./caches";
import { getDB } from "../instance";

export async function all(): Promise<Result<DefaultError, Product[]>> {
  const cache = getCache();
  if (cache !== null) return ok(cache);
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<
        Pick<
          DB.Product,
          | "product_id"
          | "product_barcode"
          | "product_name"
          | "product_stock"
          | "product_price"
          | "product_capital"
        >[]
      >(
        "SELECT product_id, product_barcode, product_name, product_stock, product_price, product_capital FROM products"
      ),
  });
  if (errMsg !== null) return err(errMsg);
  const items = res.map((r) => ({
    barcode: r.product_barcode ?? undefined,
    name: r.product_name,
    price: r.product_price,
    id: r.product_id,
    stock: r.product_stock,
    capital: r.product_capital
  }));
  setCache(items);
  return ok(items);
}
