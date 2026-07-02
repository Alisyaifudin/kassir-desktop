import { Context, Effect } from "effect";
import { Product } from "./type";
import { ProductAlreadyExistError, ProductError, UniqueCodeError } from "./error";

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    get: {
      all: () => Effect.Effect<Product[], ProductError>;
    };
    add: {
      external: (
        product: Product,
      ) => Promise<ProductError | UniqueCodeError | ProductAlreadyExistError|null>;
    };
  }
>() {}
