import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { SocialError, SocialService, type Social } from ".";
import { DatabaseService, type DbError } from "../db";

type SocialRow = {
  social_id: string;
  social_name: string;
  social_value: string;
  social_updated_at: number;
  social_sync_at: number | null;
};

// The whole table is small and read in one go, so it fits the one-ref model.
const SELECT_SOCIALS = `
  SELECT social_id, social_name, social_value, social_updated_at, social_sync_at
  FROM socials
  WHERE social_deleted_at IS NULL`;

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

    // Writes belong to the Social page, which is not migrated yet; until then
    // this service is the read side the receipt needs.
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

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(socialsRef))),
        refresh: () => hydrate(),
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(socialsRef.changes))),
      },
    };
  }),
);
