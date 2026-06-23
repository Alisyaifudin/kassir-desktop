type Row = {
  id: string;
  createdAt: number;
  paidAt: number;
  rounding: number;
  creditAt?: number;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  note: string;
  fix: number;
  subtotal: number;
  total: number;
  updatedAt: number;
  method: {
    id: string;
    name?: string;
    kind: DB.MethodEnum;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  product?: {
    id: string;
    name: string;
    price: number;
    qty: number;
    capital: number;
    total: number;
    eventId?: string;
  };
  discount?: {
    recordProductId: string;
    id: string;
    value: number;
    eff: number;
    kind: DB.DiscKind;
  };
  extra?: {
    id: string;
    name: string;
    value: number;
    eff: number;
    kind: DB.ValueKind;
  };
};

export type Record = {
  id: string;
  createdAt: number;
  paidAt: number;
  rounding: number;
  creditAt?: number;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  note: string;
  fix: number;
  subtotal: number;
  total: number;
  updatedAt: number;
  method: {
    id: string;
    name?: string;
    kind: DB.MethodEnum;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  products: {
    id: string;
    name: string;
    price: number;
    qty: number;
    capital: number;
    total: number;
    eventId?: string;
    discounts: {
      id: string;
      value: number;
      eff: number;
      kind: DB.DiscKind;
    }[];
  }[];
  extras: {
    id: string;
    name: string;
    value: number;
    eff: number;
    kind: DB.ValueKind;
  }[];
};

/**
 * Map flat sqlx rows (with cartesian product from JOINs) into a single Record,
 * deduplicating products, discounts, and extras.
 */
export function mapRowsToRecord(rows: Row[]): Record {
  const first = rows[0];

  // Aggregate products (deduplicated by id)
  const productMap = new Map<string, Record["products"][number]>();
  // Aggregate discounts by recordProductId
  const discountMap = new Map<string, Record["products"][number]["discounts"]>();
  // Aggregate extras (deduplicated by id)
  const extraMap = new Map<string, Record["extras"][number]>();

  for (const row of rows) {
    // Collect products
    if (row.product && !productMap.has(row.product.id)) {
      productMap.set(row.product.id, {
        ...row.product,
        discounts: [],
      });
    }
    // Collect discounts
    if (row.discount) {
      let discounts = discountMap.get(row.discount.recordProductId);
      if (!discounts) {
        discounts = [];
        discountMap.set(row.discount.recordProductId, discounts);
      }
      if (!discounts.some((d) => d.id === row.discount!.id)) {
        discounts.push({
          id: row.discount.id,
          value: row.discount.value,
          eff: row.discount.eff,
          kind: row.discount.kind,
        });
      }
    }
    // Collect extras
    if (row.extra && !extraMap.has(row.extra.id)) {
      extraMap.set(row.extra.id, row.extra);
    }
  }

  // Wire discounts into products
  for (const [productId, discounts] of discountMap) {
    const product = productMap.get(productId);
    if (product) {
      product.discounts = discounts;
    }
  }

  return {
    id: first.id,
    createdAt: first.createdAt,
    paidAt: first.paidAt,
    rounding: first.rounding,
    creditAt: first.creditAt,
    cashier: first.cashier,
    mode: first.mode,
    pay: first.pay,
    note: first.note,
    fix: first.fix,
    subtotal: first.subtotal,
    total: first.total,
    updatedAt: first.updatedAt,
    method: first.method,
    customer: first.customer,
    products: Array.from(productMap.values()),
    extras: Array.from(extraMap.values()),
  };
}

/**
 * Group flat sqlx rows by record id, then map each group into a Record.
 */
export function mapRowsToRecords(rows: Row[]): Record[] {
  const recordMap = new Map<string, Row[]>();

  for (const row of rows) {
    let group = recordMap.get(row.id);
    if (!group) {
      group = [];
      recordMap.set(row.id, group);
    }
    group.push(row);
  }

  const records: Record[] = [];

  for (const [, group] of recordMap) {
    records.push(mapRowsToRecord(group));
  }

  return records;
}
