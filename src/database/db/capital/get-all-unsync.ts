import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";

type ExistCapital = {
  id: string;
  capital: number;
  productId: string;
  stock: number;
  updatedAt: number;
};

type DeletedCapital = {
  id: string;
  deletedAt: number;
};

type GetAfterResult = {
  exist: ExistCapital[];
  deleted: DeletedCapital[];
};

export function getAllUnsyncCapitals() {
  return Effect.gen(function* () {
    const raw = yield* sqlx.capital.get.allUnsync();
    const capitals = raw.reduce<GetAfterResult>(
      (acc, { deletedAt, ...r }) => {
        if (deletedAt === undefined) {
          acc.exist.push(r);
        } else {
          acc.deleted.push({
            id: r.id,
            deletedAt,
          });
        }
        return acc;
      },
      { exist: [], deleted: [] },
    );
    return capitals;
  });
}
