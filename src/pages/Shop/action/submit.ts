import Decimal from "decimal.js";
import { z } from "zod";
import { db } from "~/database";
import { DefaultError, err, integer, NotFound, numeric, ok, Result } from "~/lib/utils";
import { tx } from "~/transaction";
import { Extra } from "~/transaction/extra/get-by-tab";
import { Product } from "~/transaction/product/get-by-tab";
import { Transaction } from "~/transaction/transaction/get-by-tab";

const schema = z.object({
  tab: integer,
  pay: numeric,
  rounding: numeric,
  cashier: z.string().transform((v) => (v.trim() === "" ? "admin" : v)),
  isCredit: z.string().transform((v) => v === "true"),
});

export async function submitAction(formdata: FormData) {
  const parsed = schema.safeParse({
    tab: formdata.get("tab"),
    pay: formdata.get("pay"),
    rounding: formdata.get("rounding"),
    cashier: formdata.get("cashier"),
    isCredit: formdata.get("is-credit"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      global: errs.tab?.join("; "),
      pay: errs.tab?.join("; "),
      rounding: errs.rounding?.join("; "),
      isCredit: errs.isCredit?.join("; "),
    };
  }
  const { tab, pay, rounding, isCredit, cashier } = parsed.data;
  const [errMsg, res] = await getTransaction(tab);
  if (errMsg) {
    return {
      global: errMsg,
    };
  }
  const { transaction, products: pRaw, extras: eRaw } = res;
  const { fix, customer, methodId, mode, note } = transaction;
  let { products, subtotal } = transformProducts(pRaw, fix);
  const { extras, total } = transformExtras(subtotal, eRaw, fix);
  const grandTotal = Number(new Decimal(total).plus(rounding).toFixed(fix));
  if (!isCredit && pay < grandTotal) {
    return {
      global: "Pembayaran tidak cukup",
    };
  }
  products = calcCapitals(products, subtotal, grandTotal, fix);
  // DO THE TRANSACTION 😱
  const [[errRecord, timestamp], [errLast, lastId]] = await Promise.all([
    db.record.add({
      cashier,
      customer,
      fix,
      isCredit,
      methodId,
      mode,
      note,
      pay,
      rounding,
      subtotal,
      total,
    }),
    db.recordProduct.get.lastId(),
  ]);
  if (errRecord !== null) {
    return { global: errRecord };
  }
  if (errLast !== null) {
    return { global: errLast };
  }
  const ids = Array.from({ length: products.length }).map((_, i) => i + 1 + lastId);
  if (customer.id === undefined && customer.name.trim() !== "") {
    const errCustomer = await db.customer.add(customer.name, customer.phone);
    if (errCustomer !== null) {
      db.record.delByTimestamp(timestamp);
      return {
        global: "Gagal menyimpan pelanggan",
      };
    }
  }
  const promises: Promise<DefaultError | NotFound | null>[] = [];
  for (const extra of extras) {
    promises.push(db.recordExtra.add({ timestamp, ...extra }));
  }
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const recordId = ids[i];
    promises.push(
      db.recordProduct.add({
        recordId,
        mode,
        fix,
        timestamp,
        productId: product.product?.id,
        ...product,
      })
    );
  }
  const resPromise = await Promise.all(promises);
  for (const errMsg of resPromise) {
    if (errMsg !== null) {
      db.record.delByTimestamp(timestamp);
      return {
        global: "Gagal menyimpan transaksi. Coba lagi/refresh.",
      };
    }
  }
  tx.transaction.del(tab);
  return {
    redirect: `/records/${timestamp}?url_back=${encodeURI("/")}&clear=true`,
  };
}

type Res = {
  transaction: Transaction;
  products: Product[];
  extras: Extra[];
};

async function getTransaction(tab: number): Promise<Result<DefaultError | NotFound, Res>> {
  const promises = await Promise.all([
    tx.transaction.get.byTab(tab),
    tx.product.getByTab(tab),
    tx.extra.getByTab(tab),
  ]);
  for (const [errMsg] of promises) {
    if (errMsg !== null) return err(errMsg);
  }
  const transaction = promises[0][1]!;
  const products = promises[1][1]!;
  const extras = promises[2][1]!;
  return ok({ transaction, products, extras });
}

type DiscountT = Product["discounts"][number] & { eff: number };

function transformDiscounts(
  price: number,
  qty: number,
  discounts: Product["discounts"],
  fix: number
): { discounts: DiscountT[]; total: number } {
  const subtotal = new Decimal(price).times(qty);
  let total = new Decimal(subtotal);
  const discs: DiscountT[] = [];
  for (const d of discounts) {
    let eff = d.value;
    switch (d.kind) {
      case "number":
        break;
      case "pcs":
        eff = Number(new Decimal(d.value).times(price).toFixed(fix));
        break;
      case "percent":
        eff = Number(new Decimal(d.value).times(total).div(100).toFixed(fix));
        break;
    }
    total = total.minus(eff);
    discs.push({
      eff,
      id: d.id,
      kind: d.kind,
      value: d.value,
    });
  }
  return { discounts: discs, total: Number(total.toFixed(fix)) };
}

type ProductT = Omit<Product, "discounts"> & {
  total: number;
  capital: number;
  discounts: DiscountT[];
};

function transformProducts(
  products: Product[],
  fix: number
): { products: ProductT[]; subtotal: number } {
  const prods: ProductT[] = [];
  let subtotal = new Decimal(0);
  for (const p of products) {
    const { total, discounts } = transformDiscounts(p.price, p.qty, p.discounts, fix);
    subtotal = subtotal.plus(total);
    prods.push({
      barcode: p.barcode,
      discounts,
      capital: 0, // temporary
      product: p.product,
      id: p.id,
      name: p.name,
      price: p.price,
      qty: p.qty,
      stock: p.qty,
      tab: p.tab,
      total,
    });
  }
  return { subtotal: Number(subtotal.toFixed(fix)), products: prods };
}

type ExtraT = Extra & { eff: number };

function transformExtras(
  subtotal: number,
  extras: Extra[],
  fix: number
): { extras: ExtraT[]; total: number } {
  const exs: ExtraT[] = [];
  let total = new Decimal(subtotal);
  for (const d of extras) {
    let eff = d.value;
    if (d.kind === "percent") {
      eff = Number(new Decimal(d.value).times(total).div(100).toFixed(fix));
    }
    total = total.plus(eff);
    exs.push({
      eff,
      id: d.id,
      kind: d.kind,
      value: d.value,
      name: d.name,
      saved: d.saved,
      tab: d.tab,
    });
  }
  return { extras: exs, total: total.toNumber() };
}

function calcCapitals(
  products: ProductT[],
  subtotal: number,
  grandTotal: number,
  fix: number
): ProductT[] {
  return products.map((p) => {
    const eff =
      subtotal > 0 ? new Decimal(p.total).div(subtotal).times(grandTotal) : new Decimal(0);
    const capital = p.qty > 0 ? eff.div(p.qty) : 0;
    p.capital = Number(capital.toFixed(fix));
    return p;
  });
}
