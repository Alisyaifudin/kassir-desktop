import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { SocialError, SocialService, type Social, type SocialInput } from ".";
import { DatabaseService, type DbError } from "../db";
import { generateId } from "~/lib/random";

type SocialRow = {
  social_id: string;
  social_name: string;
  social_value: string;
  social_updated_at: number;
  social_sync_at: number | null;
};

// The whole table is small and read in one go, so it fits the one-ref model.
// Ids are ULIDs, so sorting by id keeps contacts in the order they were added —
// and, unlike ordering by social_updated_at, an edit does not reshuffle the
// receipt.
const SELECT_SOCIALS = `
  SELECT social_id, social_name, social_value, social_updated_at, social_sync_at
  FROM socials
  WHERE social_deleted_at IS NULL
  ORDER BY social_id ASC`;

function dbErrorToSocialError(error: DbError): SocialError {
  return new SocialError({ message: error.message });
}

function rowToSocial(row: SocialRow): Social {
  return {
    id: row.social_id,
    name: row.social_name,
    value: row.social_value,
    updatedAt: row.social_updated_at,
    syncAt: row.social_sync_at,
  };
}

export const SocialLive = Layer.effect(
  SocialService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Seeded empty so layer construction stays synchronous; the first
    // subscriber or read hydrates it.
    const socialsRef = yield* SubscriptionRef.make<Social[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Social[], SocialError> {
      return db
        .selectMany<SocialRow>(SELECT_SOCIALS)
        .pipe(Effect.mapError(dbErrorToSocialError), Effect.map((rows) => rows.map(rowToSocial)));
    }

    function hydrate(): Effect.Effect<void, SocialError> {
      return Effect.gen(function* () {
        const socials = yield* load();
        yield* SubscriptionRef.set(socialsRef, socials);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, SocialError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function commit(statements: { sql: string; bindings: (string | number | null)[] }[]) {
      return db.transaction(statements).pipe(Effect.mapError(dbErrorToSocialError));
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(socialsRef))),
        // Hydrates on first subscribe, so `useStream` stays in `init` until the
        // rows arrive, then replays the list and every change.
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(socialsRef.changes))),
      },
      add(input: SocialInput) {
        return Effect.gen(function* () {
          const id = generateId();
          const now = Date.now();
          yield* commit([
            {
              sql: `INSERT INTO socials (
                  social_id, social_name, social_value,
                  social_updated_at, social_sync_at, social_deleted_at
                ) VALUES ($1, $2, $3, $4, NULL, NULL)`,
              bindings: [id, input.name, input.value, now],
            },
          ]);
          yield* hydrate();
          return id;
        });
      },
      set: {
        info(id, input) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE socials SET
                    social_name = $1, social_value = $2,
                    social_updated_at = $3, social_sync_at = NULL
                  WHERE social_id = $4`,
                bindings: [input.name, input.value, now, id],
              },
            ]);
            yield* hydrate();
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE socials SET
                    social_deleted_at = $1, social_updated_at = $1, social_sync_at = NULL
                  WHERE social_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* hydrate();
          });
        },
      },
      refresh: () => hydrate(),
    };
  }),
);
