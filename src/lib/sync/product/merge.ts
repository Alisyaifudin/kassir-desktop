import { Effect } from "effect";
import { db } from "~/database";
import { ProductServer } from "~/server/product/get";

export function merge(products: ProductServer[]) {
  return Effect.gen(function* () {
    if (products.length === 0) return undefined;
    const productMap = yield* db.product.get.updated(products.map((p) => p.id));
    const addProducts: ProductServer[] = [];
    const updateProducts: ProductServer[] = [];
    let latestUpdatedAt = 0;
    for (const product of products) {
      if (latestUpdatedAt < product.updatedAt) {
        latestUpdatedAt = product.updatedAt;
      }
      const updatedAt = productMap.get(product.id);
      if (updatedAt === undefined) {
        addProducts.push(product);
      } else if (updatedAt < product.updatedAt) {
        updateProducts.push(product);
      }
    }
    yield* Effect.all([insert(addProducts), update(updateProducts)], { concurrency: "unbounded" });
    return latestUpdatedAt;
  });
}

function insert(products: ProductServer[]) {
  return Effect.all(
    products.map((product) =>
      db.product.add.sync(product).pipe(
        Effect.as(null),
        Effect.catchAll((e) =>
          Effect.succeed({
            error: e,
            id: product.id,
          }),
        ),
      ),
    ),
    { concurrency: 10 },
  ).pipe(Effect.map((res) => res.filter((r) => r !== null)));
}

function update(products: ProductServer[]) {
  return Effect.all(
    products.map((product) =>
      db.product.update.sync(product).pipe(
        Effect.as(null),
        Effect.catchAll((e) =>
          Effect.succeed({
            error: e,
            id: product.id,
          }),
        ),
      ),
    ),
    { concurrency: 10 },
  ).pipe(Effect.map((res) => res.filter((r) => r !== null)));
}
