import { useSyncExternalStore } from "react";
import { Effect } from "effect";
import { CustomerService, CustomerError } from "~/services/customer";
import type { Customer } from "~/services/customer/type";
import type { Listener } from "~/lib/state";

// ---------------------------------------------------------------------------
// Types & default data
// ---------------------------------------------------------------------------

export interface TestCustomer {
  name: string;
  phone: string;
  id: string;
}

export const defaultCustomers: TestCustomer[] = [
  { name: "Budi", phone: "08123456789", id: "1" },
  { name: "Ani", phone: "08987654321", id: "2" },
  { name: "Citra", phone: "08561234567", id: "3" },
];

// ---------------------------------------------------------------------------
// Stateful mock — useSyncExternalStore-backed, mutations cause re-render
// ---------------------------------------------------------------------------

export class StatefullCustomers {
  customers: TestCustomer[];
  listeners = new Set<Listener>();

  constructor(customers?: TestCustomer[]) {
    this.customers = customers ?? [...defaultCustomers];
  }

  getSnapshot(): TestCustomer[] {
    return this.customers;
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

  useCustomers(): Customer[] {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }

  add(customer: TestCustomer) {
    this.customers = [...this.customers, customer];
    this.notify();
  }

  delete(id: string) {
    this.customers = this.customers.filter((c) => c.id !== id);
    this.notify();
  }

  set(id: string, name: string, phone: string) {
    this.customers = this.customers.map((c) =>
      c.id === id ? { ...c, name, phone } : c,
    );
    this.notify();
  }

  reset(customers?: TestCustomer[]) {
    this.customers = customers ?? [...defaultCustomers];
    this.notify();
  }
}

// ---------------------------------------------------------------------------
// Mock service factory — wired to stateful store
// ---------------------------------------------------------------------------

export function makeCustomerService(opts?: {
  loader?: () => Effect.Effect<void, CustomerError>;
  state?: StatefullCustomers;
  /** If set, add() fails with this error message via CustomerError */
  addError?: string;
  /** If set, delete() fails with this error message via CustomerError */
  deleteError?: string;
  /** If set, set() fails with this error message via CustomerError */
  setError?: string;
}): typeof CustomerService.Service {
  const state = opts?.state ?? new StatefullCustomers();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useCustomers: () => state.useCustomers(),
    add: (name, phone) => {
      if (opts?.addError) {
        return Effect.fail(new CustomerError(new Error(opts.addError)));
      }
      const newCustomer: TestCustomer = {
        name,
        phone,
        id: Math.random().toString(36).slice(2),
      };
      state.add(newCustomer);
      return Effect.void;
    },
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new CustomerError(new Error(opts.deleteError)));
      }
      state.delete(id);
      return Effect.void;
    },
    set: (id, name, phone) => {
      if (opts?.setError) {
        return Effect.fail(new CustomerError(new Error(opts.setError)));
      }
      state.set(id, name, phone);
      return Effect.void;
    },
  };
}
