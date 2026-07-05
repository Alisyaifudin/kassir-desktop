import { useSyncExternalStore } from "react";
import { Effect } from "effect";
import { CashierService, CashierError } from "~/services/cashier";
import type { Cashier } from "~/services/cashier";
import { UserService, UserError } from "~/services/user";
import type { Listener } from "~/lib/state";

// ---------------------------------------------------------------------------
// Types & default data
// ---------------------------------------------------------------------------

export interface TestCashier {
  name: string;
  role: DBNamespace.Role;
  id: string;
}

export const defaultCashiers: TestCashier[] = [
  { name: "Budi", role: "admin", id: "1" },
  { name: "Ani", role: "user", id: "2" },
  { name: "Citra", role: "user", id: "3" },
];

export const defaultUser: TestCashier = { name: "Budi", role: "admin", id: "1" };

// ---------------------------------------------------------------------------
// Stateful mocks — useSyncExternalStore-backed, so mutations cause re-render
// ---------------------------------------------------------------------------

export class StatefullCashiers {
  cashiers: TestCashier[];
  listeners = new Set<Listener>();

  constructor(cashiers?: TestCashier[]) {
    this.cashiers = cashiers ?? [...defaultCashiers];
  }

  getSnapshot(): TestCashier[] {
    return this.cashiers;
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  useCashiers(): Cashier[] {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }

  delete(id: string) {
    this.cashiers = this.cashiers.filter((c) => c.id !== id);
    this.notify();
  }

  add(cashier: TestCashier) {
    this.cashiers = [...this.cashiers, cashier];
    this.notify();
  }

  setName(id: string, name: string) {
    this.cashiers = this.cashiers.map((c) => (c.id === id ? { ...c, name } : c));
    this.notify();
  }

  setRole(id: string, role: DBNamespace.Role) {
    this.cashiers = this.cashiers.map((c) => (c.id === id ? { ...c, role } : c));
    this.notify();
  }

  reset(cashiers?: TestCashier[]) {
    this.cashiers = cashiers ?? [...defaultCashiers];
    this.notify();
  }
}

export class StatefullUser {
  user: TestCashier;
  listeners = new Set<Listener>();

  constructor(user?: TestCashier) {
    this.user = user ?? { ...defaultUser };
  }

  getSnapshot(): TestCashier {
    return this.user;
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  useUser(): Cashier {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }

  setUser(user: TestCashier) {
    this.user = user;
    this.notify();
  }

  reset(user?: TestCashier) {
    this.user = user ?? { ...defaultUser };
    this.notify();
  }
}

// ---------------------------------------------------------------------------
// Mock service factories — wired to stateful stores
// ---------------------------------------------------------------------------

export function makeCashierService(opts?: {
  loader?: () => Effect.Effect<void, CashierError>;
  state?: StatefullCashiers;
  /** If set, add() returns a failure with this error message via CashierError */
  addError?: string;
  /** If set, delete() returns a failure with this error message via CashierError */
  deleteError?: string;
  /** If set, set.name() returns a failure with this error message via CashierError */
  setNameError?: string;
  /** If set, set.role() returns a failure with this error message via CashierError */
  setRoleError?: string;
}): typeof CashierService.Service {
  const state = opts?.state ?? new StatefullCashiers();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useCashiers: () => state.useCashiers(),
    add: (input) => {
      if (opts?.addError) {
        return Effect.fail(new CashierError(new Error(opts.addError)));
      }
      const newCashier: TestCashier = {
        name: input.name,
        id: Math.random().toString(36).slice(2),
        role: input.role ?? "user",
      };
      state.add(newCashier);
      return Effect.succeed(newCashier);
    },
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new CashierError(new Error(opts.deleteError)));
      }
      state.delete(id);
      return Effect.void;
    },
    set: {
      name: (id, name) => {
        if (opts?.setNameError) {
          return Effect.fail(new CashierError(new Error(opts.setNameError)));
        }
        state.setName(id, name);
        return Effect.void;
      },
      hash: () => Effect.void,
      role: (id, role) => {
        if (opts?.setRoleError) {
          return Effect.fail(new CashierError(new Error(opts.setRoleError)));
        }
        state.setRole(id, role);
        return Effect.void;
      },
    },
    get: {
      all: () => Effect.succeed(state.cashiers),
      byId: () => Effect.fail(new CashierError(new Error("not implemented"))),
    },
  };
}

export function makeUserService(opts?: {
  loader?: () => Effect.Effect<void, UserError>;
  state?: StatefullUser;
}): typeof UserService.Service {
  const state = opts?.state ?? new StatefullUser();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useUser: () => state.useUser(),
    get user() {
      return state.user;
    },
    setUser: (user) => {
      state.setUser(user);
      return Effect.void;
    },
    logout: () => state.reset(),
    login: (user) => state.setUser(user),
  };
}
