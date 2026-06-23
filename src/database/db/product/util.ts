type Row = {
  id: string;
  name: string;
  price: number;
  note: string;
  updatedAt: number;
  deletedAt: number | null;
  code: string | null;
  capital: {
    id: string | null;
    capital: number | null;
    stock: number | null;
  };
};

export type Product = {
  id: string;
  name: string;
  price: number;
  note: string;
  updatedAt: number;
  deletedAt: number | null;
  codes: string[];
  capitals: {
    id: string;
    stock: number;
    capital: number;
  }[];
};

/**
 * Map flat sqlx rows (with cartesian product from JOINs) into a single Product,
 * deduplicating codes and capitals.
 */
export function mapRowsToProduct(rows: Row[]): Product {
  const first = rows[0];

  const codes = new Set<string>();
  const capitalMap = new Map<string, Product["capitals"][number]>();

  for (const row of rows) {
    if (row.code !== null) {
      codes.add(row.code);
    }
    if (row.capital.id !== null && !capitalMap.has(row.capital.id)) {
      capitalMap.set(row.capital.id, {
        id: row.capital.id,
        stock: row.capital.stock!,
        capital: row.capital.capital!,
      });
    }
  }

  return {
    id: first.id,
    name: first.name,
    price: first.price,
    note: first.note,
    updatedAt: first.updatedAt,
    deletedAt: first.deletedAt,
    codes: Array.from(codes),
    capitals: Array.from(capitalMap.values()),
  };
}

/**
 * Group flat sqlx rows by product id, then map each group into a Product.
 */
export function mapRowsToProducts(rows: Row[]): Product[] {
  const productMap = new Map<string, Row[]>();

  for (const row of rows) {
    let group = productMap.get(row.id);
    if (!group) {
      group = [];
      productMap.set(row.id, group);
    }
    group.push(row);
  }

  const products: Product[] = [];

  for (const [, group] of productMap) {
    products.push(mapRowsToProduct(group));
  }

  return products;
}
