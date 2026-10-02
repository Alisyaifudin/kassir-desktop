import { Effect, Layer } from "effect";
import { AuthService } from "./auth";
import { AuthLive } from "./auth/live";
import { CashierService } from "./cashier";
import { CashierLive } from "./cashier/live";
import { ConfigService } from "./config";
import { ConfigLive } from "./config/live";
import { DatabaseLive } from "./db/live";
import { LocalStorageLive } from "./local-storage/live";
import { StoreLive } from "./store/live";

/** Layers that back the public services but are not exposed on `service`. */
const hiddenLive = Layer.mergeAll(DatabaseLive, LocalStorageLive, StoreLive);

const cashierLive = CashierLive.pipe(Layer.provide(hiddenLive));
const configLive = ConfigLive.pipe(Layer.provide(hiddenLive));

// Auth also needs the cashier service to verify the session's id.
const authLive = AuthLive.pipe(Layer.provide(hiddenLive), Layer.provide(cashierLive));

const appLive = Layer.mergeAll(configLive, cashierLive, authLive);

export const service = Effect.runSync(
  Effect.gen(function* () {
    return {
      config: yield* ConfigService,
      cashier: yield* CashierService,
      auth: yield* AuthService,
    };
  }).pipe(Effect.provide(appLive)),
);
