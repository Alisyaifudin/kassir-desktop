import { Effect, Context, Data } from "effect";
import type { MarginEstimate } from "../analytics";

export class ConfigError extends Data.TaggedError("ConfigError")<{ message: string }> {}

/** How the product list is laid out: cards (grid) or rows (table). */
export type ProductView = "grid" | "table";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    /**
     * The product list's last chosen layout. The URL still decides the current
     * view when it carries one; this is what a bare `/products` opens on.
     */
    productView: {
      get: () => Effect.Effect<ProductView, ConfigError>;
      set: (view: ProductView) => Effect.Effect<void, ConfigError>;
    };
    /**
     * The Profit page's rule for a line whose stored cost is not one — `min(total
     * × percent, raw)` per line. A per-machine preference, hydrated at build like
     * the view above, because the page's first query needs it synchronously: run
     * once with a default and once with the stored value, the chart would flicker
     * between two answers.
     */
    marginEstimate: {
      get: () => Effect.Effect<MarginEstimate, ConfigError>;
      /** Both numbers are clamped on the way in; the effect is idempotent. */
      set: (estimate: MarginEstimate) => Effect.Effect<void, ConfigError>;
    };
  }
>() {}
