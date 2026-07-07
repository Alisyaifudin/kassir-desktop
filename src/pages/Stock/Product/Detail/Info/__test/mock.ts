import { Effect } from "effect";
import { ProductService } from "~/services/product";
import { ProductError, UniqueCodeError } from "~/services/product/error";
import type { Product, HistoryEvent } from "~/services/product/type";
import { UserService } from "~/services/user";
import { NotFoundError } from "~/lib/error-effect";

// ── Default fixtures ──────────────────────────────────────────

export const defaultProduct: Product = {
  id: "product-1",
  name: "Kopi Arabica",
  price: 25000,
  note: "Kopi specialty grade A",
  updatedAt: Date.now(),
  codes: ["KOPI01", "ARABICA"],
  capitals: [
    { id: "cap-1", stock: 50, capital: 18000 },
    { id: "cap-2", stock: 30, capital: 20000 },
  ],
};

export const defaultEvents: HistoryEvent[] = [
  { id: "ev-1", timestamp: Date.now() - 86400000, note: "Penjualan", value: 5, record: { id: "rec-1", price: 25000, capital: 18000 } },
  { id: "ev-2", timestamp: Date.now() - 172800000, note: "Pembelian", value: -10 },
];

export const defaultUser = { name: "Admin", role: "admin" as DBNamespace.Role, id: "u-1" };

// ── ProductService mock ───────────────────────────────────────

export function makeProductService(opts?: {
  product?: Product;
  productError?: string;
  notFound?: boolean;
  events?: HistoryEvent[];
  eventsError?: string;
  updateError?: string;
  deleteError?: string;
}): typeof ProductService.Service {
  return {
    get: {
      all: () => Effect.succeed([]),
      byId: () => {
        if (opts?.notFound) return Effect.fail(new NotFoundError(new Error("Not found")));
        if (opts?.productError) return Effect.fail(new ProductError(new Error(opts.productError)));
        return Effect.succeed(opts?.product ?? defaultProduct);
      },
      events: () => {
        if (opts?.eventsError) return Effect.fail(new ProductError(new Error(opts.eventsError)));
        return Effect.succeed(opts?.events ?? defaultEvents);
      },
    },
    add: {
      new: () => Effect.void,
      external: () => Promise.resolve(null),
    },
    update: {
      info: () => {
        if (opts?.updateError) {
          return Effect.fail(new UniqueCodeError(
            { code: "DUP", name: "test" },
            { code: "DUP", name: "existing" },
          ));
        }
        return Effect.void;
      },
    },
    delete: () => {
      if (opts?.deleteError) return Effect.fail(new ProductError(new Error(opts.deleteError)));
      return Effect.void;
    },
  };
}

// ── UserService mock ──────────────────────────────────────────

export function makeUserService(opts?: {
  role?: DBNamespace.Role;
}): typeof UserService.Service {
  const user = { ...defaultUser, role: opts?.role ?? defaultUser.role };
  return {
    loader: () => Effect.void,
    useUser: () => user,
    user,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}
