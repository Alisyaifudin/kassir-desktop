import { useSyncExternalStore } from "react";
import { Effect } from "effect";
import { MoneyService } from "~/services/money";
import { PocketService } from "~/services/pocket";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";
import type { Money } from "~/services/money/type";
import type { PocketBase } from "~/services/pocket/type";
import { MoneyError } from "~/services/money/error";
import { IoError } from "~/services/io/error";
import { BlobError } from "~/services/blob/error";
import type { Listener } from "~/lib/state";

// ---------------------------------------------------------------------------
// Default fixtures
// ---------------------------------------------------------------------------

export const defaultPocket: PocketBase = {
  id: "p1",
  name: "Penjualan",
  type: "absolute",
};

export const defaultMoney: Money[] = [
  {
    id: "m1",
    timestamp: 1700000000000,
    value: 100000,
    pocketId: "p1",
    note: "Penjualan hari Senin",
    diff: 0,
    updatedAt: 1700000000000,
  },
  {
    id: "m2",
    timestamp: 1700086400000,
    value: 50000,
    pocketId: "p1",
    note: "Penjualan hari Selasa",
    diff: 0,
    updatedAt: 1700086400000,
  },
];

// ---------------------------------------------------------------------------
// Stateful Money mock
// ---------------------------------------------------------------------------

export class StatefullMoney {
  money: Money[];
  pocket: PocketBase;
  moneyListeners = new Set<Listener>();
  pocketListeners = new Set<Listener>();

  constructor(opts?: { money?: Money[]; pocket?: PocketBase }) {
    this.money = opts?.money ?? [...defaultMoney];
    this.pocket = opts?.pocket ?? { ...defaultPocket };
  }

  getMoneySnapshot() { return this.money; }
  getPocketSnapshot() { return this.pocket; }

  subscribeMoney(cb: Listener) {
    this.moneyListeners.add(cb);
    return () => { this.moneyListeners.delete(cb); };
  }
  subscribePocket(cb: Listener) {
    this.pocketListeners.add(cb);
    return () => { this.pocketListeners.delete(cb); };
  }

  notifyMoney() { this.moneyListeners.forEach((l) => l()); }
  notifyPocket() { this.pocketListeners.forEach((l) => l()); }

  usePocket(): PocketBase {
    return useSyncExternalStore(
      (cb) => this.subscribePocket(cb),
      () => this.getPocketSnapshot(),
    );
  }

  useMoney(_start: number, _end: number): Money[] {
    return useSyncExternalStore(
      (cb) => this.subscribeMoney(cb),
      () => this.getMoneySnapshot(),
    );
  }

  deleteMoney(id: string) {
    this.money = this.money.filter((m) => m.id !== id);
    this.notifyMoney();
  }

  addMoney(m: Money) {
    this.money = [...this.money, m];
    this.notifyMoney();
  }

  setPocketName(name: string) {
    this.pocket = { ...this.pocket, name };
    this.notifyPocket();
  }
}

// ---------------------------------------------------------------------------
// MoneyService mock factory
// ---------------------------------------------------------------------------

export function makeMoneyService(opts?: {
  loader?: () => Effect.Effect<void, MoneyError>;
  state?: StatefullMoney;
  addLocalError?: string;
  deleteError?: string;
}): typeof MoneyService.Service {
  const state = opts?.state ?? new StatefullMoney();
  return {
    loader: opts?.loader ?? (() => Effect.void),
    usePocket: () => state.usePocket(),
    useMoney: (start: number, end: number) => state.useMoney(start, end),
    all: () => Effect.succeed(state.money),
    add: {
      local: (args) => {
        if (opts?.addLocalError) {
          return Effect.fail(new MoneyError(new Error(opts.addLocalError)));
        }
        const newMoney: Money = {
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          value: args.value,
          pocketId: args.pocketId,
          note: args.note,
          diff: 0,
          updatedAt: Date.now(),
        };
        state.addMoney(newMoney);
        return Effect.void;
      },
      external: () =>
        Effect.fail(new MoneyError(new Error("not implemented"))),
    },
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new MoneyError(new Error(opts.deleteError)));
      }
      state.deleteMoney(id);
      return Effect.void;
    },
    set: {
      note: () => Effect.void,
    },
  };
}

// ---------------------------------------------------------------------------
// PocketService mock factory
// ---------------------------------------------------------------------------

export function makePocketService(opts?: {
  state?: StatefullMoney;
  deleteError?: string;
  setNameError?: string;
}): typeof PocketService.Service {
  const state = opts?.state ?? new StatefullMoney();
  return {
    loader: () => Effect.void,
    usePockets: () => [],
    add: () => Effect.void,
    delete: (id) => {
      if (opts?.deleteError) {
        return Effect.fail(new MoneyError(new Error(opts.deleteError)));
      }
      return Effect.void;
    },
    set: {
      name: (_id, name) => {
        if (opts?.setNameError) {
          return Effect.fail(new MoneyError(new Error(opts.setNameError)));
        }
        state.setPocketName(name);
        return Effect.void;
      },
      type: () => Effect.void,
      ordering: () => Effect.void,
    },
  };
}

// ---------------------------------------------------------------------------
// IoService and BlobService mocks
// ---------------------------------------------------------------------------

export function makeIoService(): typeof IoService.Service {
  return {
    dialog: () => Effect.succeed("/tmp/test.json"),
    save: () => Effect.void,
  };
}

export function makeBlobService(): typeof BlobService.Service {
  return {
    convert: {
      fromObject: () => Effect.succeed(new Uint8Array()),
    },
  };
}
