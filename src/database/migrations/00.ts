import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import Database from "@tauri-apps/plugin-sql";
import Decimal from "decimal.js";
import PQueue from "p-queue";
import EventEmitter from "eventemitter3";

export function migration00000(db: Database) {
  const event = new EventEmitter();
  async function getData() {
    const [[errRecord, records], [errProd, productsAll], [errExtra, extrasAll]] = await Promise.all(
      [getAllRecord(db), getAllProduct(db), getAllExtra(db)]
    );
    if (errRecord !== null) throw new Error(errRecord);
    if (errProd !== null) throw new Error(errProd);
    if (errExtra !== null) throw new Error(errExtra);
    run(db, event, records, productsAll, extrasAll);
  }
  getData();
  return event;
}

async function run(
  db: Database,
  event: EventEmitter,
  records: Record[],
  productsAll: Product[],
  extrasAll: Extra[]
) {
  const n = records.length;
  let i = 1;
  const queue = new PQueue({ concurrency: 20 });
  for (const r of records) {
    const productsRaw = productsAll.filter((p) => p.timestamp === r.timestamp);
    const extrasRaw = extrasAll.filter((p) => p.timestamp === r.timestamp);
    const { products, extras, record } = transformRecord(r, productsRaw, extrasRaw);
    queue.add(() =>
      migrateRecord(db, products, extras, record).then(() => {
        event.emit("update", i / n);
        i++;
      })
    );
  }
  await queue.onIdle();
  await db.execute(`INSERT INTO versions VALUES (0)`);
  event.emit("finish");
}

async function migrateRecord(db: Database, products: Product[], extras: Extra[], record: Record) {
  const queue = new PQueue({ concurrency: 20 });
  for (const product of products) {
    for (const discount of product.discounts) {
      queue.add(() =>
        db.execute("UPDATE discounts SET discount_eff = $1 WHERE discount_id = $2", [
          discount.eff,
          discount.id,
        ])
      );
    }
    queue.add(() =>
      db.execute(
        "UPDATE record_products SET record_product_total = $1 WHERE record_product_id = $2",
        [product.total, product.id]
      )
    );
  }
  for (const extra of extras) {
    queue.add(() =>
      db.execute("UPDATE record_extras SET record_extra_eff = $1 WHERE record_extra_id = $2", [
        extra.eff,
        extra.id,
      ])
    );
  }
  queue.add(() =>
    db.execute("UPDATE records SET record_sub_total = $1, record_total = $2 WHERE timestamp = $3", [
      record.subTotal,
      record.total,
      record.timestamp,
    ])
  );
  return queue.onIdle();
}

function transformDiscounts(
  price: number,
  qty: number,
  discounts: Discount[]
): {
  discounts: Discount[];
  total: number;
} {
  let total = new Decimal(price).times(qty);
  const discs: Discount[] = [];
  for (const d of discounts) {
    let eff = d.value;
    switch (d.kind) {
      case "number":
        break;
      case "pcs":
        eff = price;
        break;
      case "percent":
        eff = total.times(d.value).div(100).toNumber();
    }
    total = total.minus(eff);
    discs.push({
      ...d,
      eff,
    });
  }
  return { discounts: discs, total: total.toNumber() };
}

function transformProducts(products: Product[]): { products: Product[]; subTotal: Decimal } {
  const prods: Product[] = [];
  let subTotal = new Decimal(0);
  for (const { discounts: d, ...p } of products) {
    const { discounts, total } = transformDiscounts(p.price, p.qty, d);
    prods.push({
      ...p,
      total,
      discounts,
    });
    subTotal = subTotal.plus(total);
  }
  return { products: prods, subTotal };
}

function transformExtras(base: Decimal, extras: Extra[]): { extras: Extra[]; total: Decimal } {
  const ext: Extra[] = [];
  for (const e of extras) {
    let eff = e.value;
    if (e.kind === "percent") {
      eff = base.times(e.value).div(100).toNumber();
    }
    base = base.plus(eff);
    ext.push({
      ...e,
      eff,
    });
  }
  return { extras: ext, total: base };
}

function transformRecord(
  recordRaw: Record,
  productsRaw: Product[],
  extrasRaw: Extra[]
): {
  record: Record;
  extras: Extra[];
  products: Product[];
} {
  const { products, subTotal } = transformProducts(productsRaw);
  const { extras, total } = transformExtras(subTotal, extrasRaw);
  return {
    record: {
      ...recordRaw,
      subTotal: subTotal.toNumber(),
      total: total.toNumber(),
    },
    extras,
    products,
  };
}

type Record = {
  timestamp: number;
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: "buy" | "sell";
  pay: number;
  note: string;
  methodId: number;
  fix: number;
  customer: {
    name: string;
    phone: string;
  };
  subTotal: number;
  total: number;
};

async function getAllRecord(db: Database): Promise<Result<DefaultError, Record[]>> {
  const [errMsg, res] = await tryResult<DB.Record[]>({
    run: () => db.select(`SELECT * FROM records`),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      customer: {
        name: r.record_customer_name,
        phone: r.record_customer_phone,
      },
      methodId: r.method_id,
      cashier: r.record_cashier,
      fix: r.record_fix,
      isCredit: Boolean(r.record_is_credit),
      mode: r.record_mode,
      note: r.record_note,
      paidAt: r.record_paid_at,
      pay: r.record_pay,
      rounding: r.record_rounding,
      timestamp: r.timestamp,
      subTotal: 0,
      total: 0,
    }))
  );
}

type Extra = {
  id: number;
  name: string;
  timestamp: number;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

async function getAllExtra(db: Database): Promise<Result<DefaultError, Extra[]>> {
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.RecordExtra[]>("SELECT * FROM record_extras"),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      id: r.record_extra_id,
      name: r.record_extra_name,
      timestamp: r.timestamp,
      value: r.record_extra_value,
      eff: r.record_extra_eff,
      kind: r.record_extra_kind,
    }))
  );
}
type Discount = {
  id: number;
  kind: DB.DiscKind;
  value: number;
  eff: number;
};

type Product = {
  productId?: number;
  id: number;
  timestamp: number;
  name: string;
  price: number;
  qty: number;
  capital: number;
  total: number;
  discounts: Discount[];
};

async function getAllProduct(db: Database): Promise<Result<DefaultError, Product[]>> {
  const [errMsg, rows] = await tryResult({
    run: () =>
      db.select<
        (DB.RecordProduct & {
          discount_id: number | null;
          discount_kind: DB.DiscKind | null;
          discount_value: number | null;
          discount_eff: number | null;
        })[]
      >(
        `SELECT timestamp, product_id, record_products.record_product_id, record_product_name, record_product_price,
        record_product_qty, record_product_capital, record_product_capital_raw, record_product_total,
        discount_id, discount_kind, discount_value, discount_eff
        FROM record_products LEFT JOIN discounts ON record_products.record_product_id = discounts.record_product_id
        ORDER BY discount_id`
      ),
  });
  if (errMsg !== null) return err(errMsg);
  const items: Map<number, Product> = new Map();
  for (const row of rows) {
    const discount = collectDiscount(
      row.discount_id,
      row.discount_kind,
      row.discount_value,
      row.discount_eff
    );
    const item = items.get(row.record_product_id);
    if (item === undefined) {
      items.set(row.record_product_id, {
        id: row.record_product_id,
        capital: row.record_product_capital,
        discounts: discount === undefined ? [] : [discount],
        name: row.record_product_name,
        price: row.record_product_price,
        qty: row.record_product_qty,
        timestamp: row.timestamp,
        total: row.record_product_total,
        productId: row.product_id ?? undefined,
      });
    } else if (discount !== undefined) {
      item.discounts.push(discount);
    }
  }
  return ok(Array.from(items.values()));
}

function collectDiscount(
  id: number | null,
  kind: DB.DiscKind | null,
  value: number | null,
  eff: number | null
): Discount | undefined {
  if (id === null || kind === null || value === null || eff === null) return undefined;
  return {
    eff,
    id,
    kind,
    value,
  };
}
