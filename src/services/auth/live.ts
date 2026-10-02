import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { z } from "zod";
import { AuthError, AuthService, type User } from ".";
import { CashierService } from "../cashier";
import { LocalStorageService } from "../local-storage";

const USER_KEY = "user";

const userSchema = z.object({
  id: z.string().nonempty(),
  name: z.string(),
  role: z.enum(["admin", "user"]),
});

function parseUser(value: unknown): User | null {
  const parsed = userSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toAuthError(error: { message: string }): AuthError {
  return new AuthError({ message: error.message });
}

export const AuthLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;
    const cashiers = yield* CashierService;

    // Single source of truth for the session; the first get/subscribe hydrates.
    const userRef = yield* SubscriptionRef.make<User | null>(null);
    let loaded = false;

    // Persisted user, or null if missing/malformed. A malformed entry is
    // treated as signed out rather than crashing the app.
    function readStored(): Effect.Effect<User | null> {
      return storage.get<unknown>(USER_KEY).pipe(
        Effect.map(parseUser),
        Effect.catchTag("NotFound", () => Effect.succeed(null)),
        Effect.catchTag("LocalStorageError", () => Effect.succeed(null)),
      );
    }

    function existsInDb(id: string): Effect.Effect<boolean, AuthError> {
      return cashiers.get.byId(id).pipe(
        Effect.as(true),
        Effect.catchTag("NotFound", () => Effect.succeed(false)),
        Effect.catchTag("CashierError", (error) => Effect.fail(toAuthError(error))),
      );
    }

    function hydrate(): Effect.Effect<void, AuthError> {
      return Effect.gen(function* () {
        const stored = yield* readStored();
        let user: User | null = null;

        if (stored !== null) {
          if (yield* existsInDb(stored.id)) {
            user = stored;
          } else {
            // Session points at a cashier that no longer exists — drop it.
            yield* storage
              .remove(USER_KEY)
              .pipe(Effect.catchTag("LocalStorageError", () => Effect.void));
          }
        }

        yield* SubscriptionRef.set(userRef, user);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, AuthError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    return {
      get: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(userRef))),
      set: (user) =>
        Effect.gen(function* () {
          if (user === null) {
            yield* storage.remove(USER_KEY).pipe(Effect.mapError(toAuthError));
          } else {
            yield* storage.set(USER_KEY, user).pipe(Effect.mapError(toAuthError));
          }
          yield* SubscriptionRef.set(userRef, user);
          loaded = true;
        }),
      // Hydrates on first subscribe so `useStream` stays `init` until the
      // session is verified, then replays the current user and every change.
      changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(userRef.changes))),
    };
  }),
);
