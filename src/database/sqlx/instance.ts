import Database from "@tauri-apps/plugin-sql";
import { Effect, pipe } from "effect";

let globalDB: undefined | Database = undefined;

const DB_PATH = "sqlite:data.db";

function getDB() {
  return Effect.gen(function* () {
    if (globalDB !== undefined) return globalDB;
    const loadedDb = yield* Effect.tryPromise({
      try: () => Database.load(DB_PATH),
      catch: (e) => DbError.new(e),
    });
    globalDB = loadedDb;
    return loadedDb;
  });
}

const DBWrapper = {
  try: <A>(func: (db: Database) => Promise<A>) => {
    return pipe(
      getDB(),
      Effect.flatMap((db) =>
        Effect.tryPromise({
          try: async () => {
            try {
              const res = await func(db);
              return res;
            } catch (error) {
              await db.close();
              globalDB = undefined;
              throw error;
            }
          },
          catch: (e) => {
            return DbError.new(e);
          },
        }),
      ),
    );
  },
};

export class DbError {
  readonly _tag = "DbError";
  constructor(readonly e: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new DbError(e);
    } else if (typeof e === "string") {
      const error = new Error(e);
      return new DbError(error);
    }
    const unknown = new Error("Unknown", { cause: e });
    return new DbError(unknown);
  }
  static fail(e: unknown) {
    return Effect.fail(DbError.new(e));
  }
}

export const DB = {
  execute(query: string, bindValues?: unknown[]) {
    return DBWrapper.try((db) => db.execute(query, bindValues));
  },
  select<T>(query: string, bindValues?: unknown[]) {
    return DBWrapper.try((db) => db.select<T>(query, bindValues));
  },
};
