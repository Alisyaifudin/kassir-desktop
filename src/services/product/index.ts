import { Context, Effect } from "effect";
import { Product } from "./type";
import { ProductAlreadyExistError, ProductError, UniqueCodeError } from "./error";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ProductType {
  export type SortBy = "price" | "code" | "name" | "stock" | "capital";
  export type SortDir = "asc" | "desc";
}

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    get: {
      all: () => Effect.Effect<Product[], ProductError>;
    };
    add: {
      external: (
        product: Product,
      ) => Promise<ProductError | UniqueCodeError | ProductAlreadyExistError | null>;
    };
  }
>() {}
