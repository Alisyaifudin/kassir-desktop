import { Effect } from "effect";
import { db } from "~/database/db";
import { ManyArg } from "../factory";
import { SimpleResponseError, ZodSchemaError } from "~/lib/effect-error";
import { parseJson } from "~/lib/utils";
import { UploadResponse } from "~/lib/stream";
import z from "zod";
import { Money, Pocket } from "~/server/pocket";
import { Deleted } from "~/server/schema";

type UnsyncData = {
  exist: Pocket[];
  deleted: { pocket: Deleted[]; money: Deleted[] };
};

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  failed: z.object({
    pocket: z.string().nonempty().max(100).array(),
    money: z.string().nonempty().max(100).array(),
  }),
});

export function pushPockets<E1, E2, E3, R1, R2, R3>(deps: {
  allUnsync: () => Effect.Effect<UnsyncData, E1, R1>;
  upload: (
    token: string,
    payload: UnsyncData,
    cb: (currentSize: number, totalSize: number) => void,
  ) => Effect.Effect<UploadResponse, E2, R2>;
  markUpdatedAt: (ids: string[], ts: number) => Effect.Effect<void, E3, R3>;
}) {
  return Effect.gen(function* () {
    const { token, cb } = yield* ManyArg;
    const data = yield* deps.allUnsync();
    const response = yield* deps.upload(token, data, cb.uploadCount);
    if (response.status >= 400) {
      return yield* SimpleResponseError.fail(response);
    }
    const json = yield* parseJson(response.body);
    const parsed = z.safeParse(responseBodySchema, json);
    if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
    const { timestamp, failed } = parsed.data;
    yield* markSynced({ exist: data.exist, deleted: data.deleted, failed, timestamp }, deps.markUpdatedAt);
  });
}

function markSynced<E, R>(
  {
    exist,
    deleted,
    failed,
    timestamp,
  }: {
    exist: Pocket[];
    deleted: { pocket: Deleted[]; money: Deleted[] };
    failed: { pocket: string[]; money: string[] };
    timestamp: number;
  },
  markUpdatedAt: (ids: string[], ts: number) => Effect.Effect<void, E, R>,
) {
  const failedPocketSet = new Set(failed.pocket);
  const failedMoneySet = new Set(failed.money);
  const successDeletedPocketIds = deleted.pocket.flatMap(({ id }) =>
    failedPocketSet.has(id) ? [] : [id],
  );
  const successExistPocketIds = exist.flatMap(({ id }) =>
    failedPocketSet.has(id) ? [] : [id],
  );
  const successDeletedMoneyIds = deleted.money.flatMap(({ id }) =>
    failedMoneySet.has(id) ? [] : [id],
  );
  const successExistMoneyIds = exist.flatMap(({ money }) =>
    money.flatMap((m) => (failedMoneySet.has(m.id) ? [] : [m.id])),
  );

  return Effect.all(
    [
      markUpdatedAt(successDeletedPocketIds, timestamp),
      markUpdatedAt(successExistPocketIds, timestamp),
      markUpdatedAt(successDeletedMoneyIds, timestamp),
      markUpdatedAt(successExistMoneyIds, timestamp),
    ],
    { concurrency: "unbounded" },
  );
}

export function collectPockets() {
  return Effect.gen(function* () {
    const [pocket, money] = yield* Effect.all(
      [db.pocket.get.allUnsync(), db.money.get.allUnsync()],
      { concurrency: "unbounded" },
    );
    const moneyMap = createMoneyMap(money.exist);
    const pocketExist = pocket.exist.map((pocket) => {
      const money = moneyMap.get(pocket.id) ?? [];
      return {
        ...pocket,
        money,
      };
    });
    return {
      exist: pocketExist,
      deleted: {
        pocket: pocket.deleted,
        money: money.deleted,
      },
    };
  });
}

function createMoneyMap(money: (Money & { pocketId: string })[]) {
  const exist = new Map<string, Money[]>();
  for (const m of money) {
    const moneyInMap = exist.get(m.pocketId);
    if (moneyInMap === undefined) {
      exist.set(m.pocketId, [m]);
    } else {
      moneyInMap.push(m);
    }
  }
  return exist;
}
