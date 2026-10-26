import { Effect, Context, Data, Stream } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{ message: string }> {}

export type Size = "small" | "big";

/** How the product list is laid out: cards (grid) or rows (table). */
export type ProductView = "grid" | "table";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    size: {
      get: () => Effect.Effect<Size, ConfigError>;
      set: (size: Size) => Effect.Effect<void, ConfigError>;
      changes: Stream.Stream<Size>;
    };
    /**
     * The product list's last chosen layout. The URL still decides the current
     * view when it carries one; this is what a bare `/products` opens on.
     */
    productView: {
      get: () => Effect.Effect<ProductView, ConfigError>;
      set: (view: ProductView) => Effect.Effect<void, ConfigError>;
    };
  }
>() {}
