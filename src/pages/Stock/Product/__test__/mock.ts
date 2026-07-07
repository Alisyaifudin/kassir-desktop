import { Effect } from "effect";
import { ProductService } from "~/services/product";
import { ProductError } from "~/services/product/error";
import type { Product } from "~/services/product/type";
import { UserService } from "~/services/user";

export const defaultProducts: Product[] = [
  { id: "p-1", name: "Kopi Arabica", price: 25000, note: "", updatedAt: Date.now(), codes: ["KOPI01"], capitals: [{ id: "c-1", stock: 50, capital: 18000 }] },
  { id: "p-2", name: "Gula Pasir", price: 15000, note: "", updatedAt: Date.now(), codes: ["GULA01"], capitals: [{ id: "c-2", stock: 100, capital: 12000 }] },
  { id: "p-3", name: "Teh Celup", price: 8000, note: "Stok menipis", updatedAt: Date.now(), codes: [], capitals: [{ id: "c-3", stock: 0, capital: 5000 }] },
];

export function makeProductService(opts?: {
  products?: Product[];
  allError?: string;
}): typeof ProductService.Service {
  return {
    get: {
      all: () => {
        if (opts?.allError) return Effect.fail(new ProductError(new Error(opts.allError)));
        return Effect.succeed(opts?.products ?? defaultProducts);
      },
      byId: () => Effect.fail(new ProductError(new Error("not implemented"))),
      events: () => Effect.succeed([]),
    },
    add: { new: () => Effect.void, external: () => Promise.resolve(null) },
    update: { info: () => Effect.void },
    delete: () => Effect.void,
  };
}

export function makeUserService(opts?: { role?: DBNamespace.Role }): typeof UserService.Service {
  const user = { name: "Admin", role: opts?.role ?? "admin", id: "u-1" };
  return {
    loader: () => Effect.void,
    useUser: () => user,
    user,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}
