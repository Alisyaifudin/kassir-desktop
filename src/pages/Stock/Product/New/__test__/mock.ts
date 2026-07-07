import { Effect } from "effect";
import { ProductService } from "~/services/product";
import { ProductError } from "~/services/product/error";

// ── Mock service factory ──────────────────────────────────────

export function makeProductService(opts?: {
  addError?: string;
}): typeof ProductService.Service {
  return {
    get: {
      all: () => Effect.succeed([]),
      byId: () => Effect.fail(new ProductError(new Error("not implemented"))),
      events: () => Effect.succeed([]),
    },
    add: {
      new: () => {
        if (opts?.addError) return Effect.fail(new ProductError(new Error(opts.addError)));
        return Effect.void;
      },
      external: () => Promise.resolve(null),
    },
    update: {
      info: () => Effect.void,
    },
    delete: () => Effect.void,
  };
}
