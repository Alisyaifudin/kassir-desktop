import { Context, Effect } from "effect";
import { HistoryEvent, Image, Product } from "./type";
export type { Product };
import { ProductAlreadyExistError, ProductError, UniqueCodeError } from "./error";
import { NotFoundError } from "~/lib/error-effect";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ProductType {
  export type SortBy = "price" | "code" | "name" | "stock" | "capital";
  export type SortDir = "asc" | "desc";
}

export type ProductInput = {
  name: string;
  price: number;
  codes: string[];
  capitals: { capital: number; stock: number }[];
  note: string;
};

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    get: {
      all: () => Effect.Effect<Product[], ProductError>;
      byId: (id: string) => Effect.Effect<Product, ProductError | NotFoundError>;
      events: (id: string) => Effect.Effect<HistoryEvent[], ProductError>;
      images: (id: string) => Effect.Effect<Image[], ProductError>;
    };
    add: {
      new: (input: ProductInput) => Effect.Effect<void, ProductError | UniqueCodeError>;
      external: (
        product: Product,
      ) => Promise<ProductError | UniqueCodeError | ProductAlreadyExistError | null>;
    };
    update: {
      info: (
        id: string,
        product: ProductInput,
      ) => Effect.Effect<void, ProductError | UniqueCodeError>;
    };
    delete: (id: string) => Effect.Effect<void, ProductError>;
  }
>() {}
