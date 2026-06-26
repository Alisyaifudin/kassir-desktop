import Database from "@tauri-apps/plugin-sql";
import { Effect, pipe } from "effect";
import { TxError } from "~/lib/error-effect";

let globalTX: undefined | Database = undefined;

export const TX_PATH = "sqlite:tx.db";

function getTX() {
  return Effect.gen(function* () {
    if (globalTX !== undefined) return globalTX;
    const loadedDb = yield* Effect.tryPromise({
      try: () => Database.load(TX_PATH),
      catch: (e) => TxError.new(e),
    });
    globalTX = loadedDb;
    return loadedDb;
  });
}

export const TX = {
  try: <A>(func: (tx: Database) => Promise<A>) => {
    return pipe(
      getTX(),
      Effect.flatMap((tx) =>
        Effect.tryPromise({
          try: async () => {
            try {
              const res = await func(tx);
              return res;
            } catch (error) {
              await tx.close();
              globalTX = undefined;
              throw error;
            }
          },
          catch: (e) => {
            return TxError.new(e);
          },
        }),
      ),
    );
  },
};

