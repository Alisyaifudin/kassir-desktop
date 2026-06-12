import { Effect } from "effect";
import { Pocket, PocketDeleted } from "~/server/pocket";

export function mergePockets<E1, E2, E3, E4, E5, E6, E7, R1, R2, R3, R4, R5, R6, R7>(
  items: Pocket[],
  deleted: PocketDeleted,
  now: number,
  deps: {
    getLocalPocket: (id: string) => Effect.Effect<Omit<Pocket, "money"> | null, E1, R1>;
    upsertPocketOne: (
      pocket: Omit<Pocket, "money">,
      now: number,
    ) => Effect.Effect<void, E2, R2>;
    getLocalMoneyUpdatedAt: (
      ids: string[],
    ) => Effect.Effect<Map<string, number>, E3, R3>;
    upsertMoneyMany: (
      pocketId: string,
      money: Pocket["money"],
      now: number,
    ) => Effect.Effect<void, E4, R4>;
    deletePocketMany: (
      ids: PocketDeleted["pocket"],
      now: number,
    ) => Effect.Effect<void, E5, R5>;
    deleteMoneyMany: (
      ids: PocketDeleted["money"],
      now: number,
    ) => Effect.Effect<void, E6, R6>;
    storeSet: (now: number) => Effect.Effect<void, E7, R7>;
  },
) {
  return Effect.gen(function* () {
    yield* Effect.all(
      items.map((item) => upsertPockets(item, now, deps)),
      { concurrency: 10 },
    );
    yield* deletePocket(deleted, now, deps);
    yield* deps.storeSet(now);
  });
}

function upsertPockets<E1, E2, E3, E4, R1, R2, R3, R4>(
  { money, ...pocket }: Pocket,
  now: number,
  deps: {
    getLocalPocket: (id: string) => Effect.Effect<Omit<Pocket, "money"> | null, E1, R1>;
    upsertPocketOne: (
      pocket: Omit<Pocket, "money">,
      now: number,
    ) => Effect.Effect<void, E2, R2>;
    getLocalMoneyUpdatedAt: (
      ids: string[],
    ) => Effect.Effect<Map<string, number>, E3, R3>;
    upsertMoneyMany: (
      pocketId: string,
      money: Pocket["money"],
      now: number,
    ) => Effect.Effect<void, E4, R4>;
  },
) {
  return Effect.gen(function* () {
    const localPocket = yield* deps.getLocalPocket(pocket.id);
    if (localPocket === null || localPocket.updatedAt < pocket.updatedAt) {
      yield* deps.upsertPocketOne(pocket, now);
    }
    yield* upsertMoney(pocket.id, money, now, deps);
  });
}

function upsertMoney<E1, E2, R1, R2>(
  pocketId: string,
  money: Pocket["money"],
  now: number,
  deps: {
    getLocalMoneyUpdatedAt: (
      ids: string[],
    ) => Effect.Effect<Map<string, number>, E1, R1>;
    upsertMoneyMany: (
      pocketId: string,
      money: Pocket["money"],
      now: number,
    ) => Effect.Effect<void, E2, R2>;
  },
) {
  return Effect.gen(function* () {
    const localMoney = yield* deps.getLocalMoneyUpdatedAt(money.map((m) => m.id));
    const toUpsert: Pocket["money"] = [];
    for (const m of money) {
      const updatedAt = localMoney.get(m.id);
      if (updatedAt === undefined || updatedAt < m.updatedAt) {
        toUpsert.push(m);
      }
    }
    yield* deps.upsertMoneyMany(pocketId, toUpsert, now);
  });
}

function deletePocket<E1, E2, R1, R2>(
  deleted: PocketDeleted,
  now: number,
  deps: {
    deletePocketMany: (
      ids: PocketDeleted["pocket"],
      now: number,
    ) => Effect.Effect<void, E1, R1>;
    deleteMoneyMany: (
      ids: PocketDeleted["money"],
      now: number,
    ) => Effect.Effect<void, E2, R2>;
  },
) {
  return Effect.all([
    deps.deletePocketMany(deleted.pocket, now),
    deps.deleteMoneyMany(deleted.money, now),
  ]);
}
