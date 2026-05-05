import { Effect } from "effect";
import { DB } from "../../instance";
import { generateId } from "~/lib/random";
import { productCache } from "../../product/cache";
import { getProducts } from "./get-products";
import { calcEffCapital } from "./calc-capital";
import { updateProductQuery } from "./update-product-query";
import { addProductQuery } from "./add-product-query";
import { insertRecord } from "./insert-record";
import { insertCustomer } from "./insert-customer";
import { insertExtras } from "./insert-extras";
import { insertRecordProducts } from "./insert-record-products";
import { RecordType } from "./type";

export function addOne({
  cashier,
  customer,
  fix,
  isCredit,
  methodId,
  mode,
  rounding,
  note,
  pay,
  subtotal,
  total,
  grandTotal,
  products,
  extras,
}: RecordType.Record) {
  const recordId = generateId();
  const now = Date.now();
  return Effect.gen(function* () {
    const productsInStock = yield* getProducts(products);

    const bind = {
      index: 1,
      values: [] as (number | string | null)[],
    };

    let query = insertRecord({
      recordId,
      now,
      rounding,
      isCredit,
      cashier,
      mode,
      pay,
      note,
      methodId,
      fix,
      customerName: customer.name,
      customerPhone: customer.phone,
      subtotal,
      total,
      bind,
    });

    query += insertCustomer({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      now,
      bind,
    });

    query += insertExtras({ extras, recordId, bind });

    if (products.length > 0) {
      const productFulls = yield* calcEffCapital({
        products,
        subtotal,
        grandTotal,
        fix,
        productsInStock,
      });

      const recordProducts: {
        id: string;
        productId: string;
        isNew: boolean;
      }[] = [];

      query += updateProductQuery({
        mode,
        bind,
        now,
        productFulls,
        recordProducts,
        productsInStock,
      });
      query += addProductQuery({ mode, now, bind, productFulls, recordProducts });
      query += insertRecordProducts({ productFulls, recordProducts, recordId, bind });
    }

    const wrappedQuery = `BEGIN;\n${query}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedQuery, bind.values));
    productCache.revalidate();
    return recordId;
  });
}
