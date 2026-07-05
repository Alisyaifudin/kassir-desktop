import { useSyncExternalStore } from "react";
import { Effect } from "effect";
import { PocketService } from "~/services/pocket";
import type { PocketFull } from "~/services/pocket/type";
import type { Listener } from "~/lib/state";
import { PocketError } from "~/services/pocket/error";

// ---------------------------------------------------------------------------
// Types & default data
// ---------------------------------------------------------------------------

export interface TestPocket {
  id: string;
  name: string;
  type: DBNamespace.PocketType;
  ordering: number;
  updatedAt: number;
  lastMoney?: number;
}

export const defaultPockets: TestPocket[] = [
  {
    id: "1",
    name: "Penjualan",
    type: "absolute",
    ordering: 0,
    updatedAt: Date.now(),
    lastMoney: 500000,
  },
  {
    id: "2",
    name: "Pengeluaran",
    type: "absolute",
    ordering: 1,
    updatedAt: Date.now(),
    lastMoney: 120000,
  },
  {
    id: "3",
    name: "Kas",
    type: "change",
    ordering: 2,
    updatedAt: Date.now(),
  },
];

// ---------------------------------------------------------------------------
// Stateful mock — useSyncExternalStore-backed, mutations cause re-render
// ---------------------------------------------------------------------------

export class StatefullPockets {
  pockets: TestPocket[];
  listeners = new Set<Listener>();

  constructor(pockets?: TestPocket[]) {
    this.pockets = pockets ?? [...defaultPockets];
  }

  getSnapshot(): TestPocket[] {
    return this.pockets;
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

  usePockets(): PocketFull[] {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }

  add(pocket: TestPocket) {
    this.pockets = [...this.pockets, pocket];
    this.notify();
  }

  delete(id: string) {
    this.pockets = this.pockets.filter((p) => p.id !== id);
    this.notify();
  }

  setName(id: string, name: string) {
    this.pockets = this.pockets.map((p) =>
      p.id === id ? { ...p, name } : p,
    );
    this.notify();
  }

  setOrdering(pocketIds: string[]) {
    this.pockets = pocketIds
      .map((id, i) => {
        const p = this.pockets.find((p) => p.id === id);
        return p ? { ...p, ordering: i } : undefined;
      })
      .filter(Boolean) as TestPocket[];
    this.notify();
  }

  reset(pockets?: TestPocket[]) {
    this.pockets = pockets ?? [...defaultPockets];
    this.notify();
  }
}

// ---------------------------------------------------------------------------
// Mock service factory — wired to stateful store
// ---------------------------------------------------------------------------

export function makePocketService(opts?: {
  loader?: () => Effect.Effect<void, PocketError>;
  state?: StatefullPockets;
  addError?: string;
  deleteError?: string;
  setNameError?: string;
}): typeof PocketService.Service {
  const state = opts?.state ?? new StatefullPockets();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    usePockets: () => state.usePockets(),
    add: (name) => {
      if (opts?.addError) {
        return Effect.fail(new PocketError(new Error(opts.addError)));
      }
      const newPocket: TestPocket = {
        name,
        id: Math.random().toString(36).slice(2),
        type: "absolute",
        ordering: state.pockets.length,
        updatedAt: Date.now(),
      };
      state.add(newPocket);
      return Effect.void;
    },
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new PocketError(new Error(opts.deleteError)));
      }
      state.delete(id);
      return Effect.void;
    },
    set: {
      name: (id, name) => {
        if (opts?.setNameError) {
          return Effect.fail(new PocketError(new Error(opts.setNameError)));
        }
        state.setName(id, name);
        return Effect.void;
      },
      type: () => Effect.void,
      ordering: (pocketIds) => {
        state.setOrdering(pocketIds);
        return Effect.void;
      },
    },
  };
}
