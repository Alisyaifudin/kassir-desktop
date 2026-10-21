import { Effect, Layer } from "effect";
import { AuthService } from "./auth";
import { AuthLive } from "./auth/live";
import { CashierService } from "./cashier";
import { CashierLive } from "./cashier/live";
import { ConfigService } from "./config";
import { ConfigLive } from "./config/live";
import { CustomerService } from "./customer";
import { CustomerLive } from "./customer/live";
import { DatabaseLive } from "./db/live";
import { ExtraService } from "./extra";
import { ExtraLive } from "./extra/live";
import { InfoService } from "./info";
import { InfoLive } from "./info/live";
import { LocalStorageLive } from "./local-storage/live";
import { MethodService } from "./method";
import { MethodLive } from "./method/live";
import { LogService } from "./log";
import { LogLive } from "./log/live";
import { ListingService } from "./listing";
import { ListingLive } from "./listing/live";
import { MoneyService } from "./money";
import { MoneyLive } from "./money/live";
import { ProductService } from "./product";
import { ProductLive } from "./product/live";
import { PrinterService } from "./printer";
import { PrinterLive } from "./printer/live";
import { RecordService } from "./record";
import { RecordLive } from "./record/live";
import { SocialService } from "./social";
import { SocialLive } from "./social/live";
import { StoreLive } from "./store/live";
import { SupplierService } from "./supplier";
import { SupplierLive } from "./supplier/live";
import { TransactionService } from "./transaction";
import { TransactionLive } from "./transaction/live";

/**
 * Layers that back the public services but are not exposed on `service`.
 *
 * This is the only place the Tauri plugins are reached, so it is also the seam
 * used by the end-to-end harness (`src/e2e/`) to swap the SQLite backend for an
 * in-browser one. See `buildAppLive`.
 */
export const hiddenLive = Layer.mergeAll(DatabaseLive, LocalStorageLive, StoreLive);

export type HiddenLive = typeof hiddenLive;

/** Wires every domain service on top of a given hidden backend layer. */
export function buildAppLive(hidden: HiddenLive) {
  const cashierLive = CashierLive.pipe(Layer.provide(hidden));
  const extraLive = ExtraLive.pipe(Layer.provide(hidden));
  const configLive = ConfigLive.pipe(Layer.provide(hidden));
  const customerLive = CustomerLive.pipe(Layer.provide(hidden));
  const infoLive = InfoLive.pipe(Layer.provide(hidden));
  const methodLive = MethodLive.pipe(Layer.provide(hidden));
  const logLive = LogLive;
  const listingLive = ListingLive.pipe(Layer.provide(hidden));
  const moneyLive = MoneyLive.pipe(Layer.provide(hidden));
  const productLive = ProductLive.pipe(Layer.provide(hidden));
  const printerLive = PrinterLive.pipe(Layer.provide(hidden));
  const socialLive = SocialLive.pipe(Layer.provide(hidden));
  const supplierLive = SupplierLive.pipe(Layer.provide(hidden));
  // `record` reverses a deleted record's stock movement, so it needs `product`.
  const recordLive = RecordLive.pipe(Layer.provide(hidden), Layer.provide(productLive));
  // `transaction` commits a cart through `record` and restores one from it.
  const transactionLive = TransactionLive.pipe(
    Layer.provide(hidden),
    Layer.provide(recordLive),
  );

  // Auth also needs the cashier service to verify the session's id.
  const authLive = AuthLive.pipe(Layer.provide(hidden), Layer.provide(cashierLive));

  return Layer.mergeAll(
    configLive,
    cashierLive,
    customerLive,
    extraLive,
    infoLive,
    logLive,
    listingLive,
    methodLive,
    moneyLive,
    printerLive,
    productLive,
    recordLive,
    socialLive,
    supplierLive,
    transactionLive,
    authLive,
  );
}

export const appLive = buildAppLive(hiddenLive);

/**
 * Builds the `service` object from a fully wired layer.
 *
 * Layer construction must stay synchronous — the app bootstraps with
 * `Effect.runSync` — so every service seeds its `SubscriptionRef` with an empty
 * value and hydrates on first use.
 */
export function makeService(live: typeof appLive) {
  return Effect.runSync(
    Effect.gen(function* () {
      return {
        config: yield* ConfigService,
        cashier: yield* CashierService,
        customer: yield* CustomerService,
        extra: yield* ExtraService,
        info: yield* InfoService,
        listing: yield* ListingService,
        logs: yield* LogService,
        method: yield* MethodService,
        money: yield* MoneyService,
        printer: yield* PrinterService,
        product: yield* ProductService,
        record: yield* RecordService,
        social: yield* SocialService,
        supplier: yield* SupplierService,
        transaction: yield* TransactionService,
        auth: yield* AuthService,
      };
    }).pipe(Effect.provide(live)),
  );
}

export type AppService = ReturnType<typeof makeService>;
