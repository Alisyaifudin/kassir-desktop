import { Effect, Layer } from "effect";
import { CashierService } from "./cashier";
import { CashierLive } from "./cashier/live";
import { ConfigService } from "./config";
import { ConfigLive } from "./config/live";
import { DatabaseLive } from "./db/live";
import { LocalStorageLive } from "./local-storage/live";
import { StoreLive } from "./store/live";

/** Layers that back the public services but are not exposed on `service`. */
const hiddenLive = Layer.mergeAll(DatabaseLive, LocalStorageLive, StoreLive);

const appLive = Layer.mergeAll(ConfigLive, CashierLive).pipe(Layer.provide(hiddenLive));

export const service = Effect.runSync(
  Effect.gen(function* () {
    return {
      config: yield* ConfigService,
      cashier: yield* CashierService,
    };
  }).pipe(Effect.provide(appLive)),
);
