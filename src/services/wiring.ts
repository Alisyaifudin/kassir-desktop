import { Effect, Layer } from "effect";
import { AnalyticsService } from "./analytics";
import { AnalyticsLive } from "./analytics/live";
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
import { SyncService } from "./sync";
import { SyncLive } from "./sync/live";
import { SyncTransportLive } from "./sync/transport";
import { StoreService } from "./store";
import { StoreLive } from "./store/live";
import { SupplierService } from "./supplier";
import { SupplierLive } from "./supplier/live";
import { TransactionService } from "./transaction";
import { TransactionLive } from "./transaction/live";
import { ZoomService } from "./zoom";
import { ZoomLive } from "./zoom/live";

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
  const analyticsLive = AnalyticsLive.pipe(Layer.provide(hidden));
  const cashierLive = CashierLive.pipe(Layer.provide(hidden));
  const extraLive = ExtraLive.pipe(Layer.provide(hidden));
  const configLive = ConfigLive.pipe(Layer.provide(hidden));
  const customerLive = CustomerLive.pipe(Layer.provide(hidden));
  const infoLive = InfoLive.pipe(Layer.provide(hidden));
  const methodLive = MethodLive.pipe(Layer.provide(hidden));
  const logLive = LogLive;
  const moneyLive = MoneyLive.pipe(Layer.provide(hidden));
  const productLive = ProductLive.pipe(Layer.provide(hidden));
  // The POS catalogue is derived from `product`, so it has no state of its own.
  const listingLive = ListingLive.pipe(Layer.provide(hidden), Layer.provide(productLive));
  const printerLive = PrinterLive.pipe(Layer.provide(hidden));
  const socialLive = SocialLive.pipe(Layer.provide(hidden));
  const supplierLive = SupplierLive.pipe(Layer.provide(hidden));
  const zoomLive = ZoomLive.pipe(Layer.provide(hidden));
  // `record` reverses a deleted record's stock movement, so it needs `product`.
  const recordLive = RecordLive.pipe(Layer.provide(hidden), Layer.provide(productLive));
  // `transaction` commits a cart through `record` and restores one from it.
  const transactionLive = TransactionLive.pipe(Layer.provide(hidden), Layer.provide(recordLive));

  // Auth also needs the cashier service to verify the session's id.
  const authLive = AuthLive.pipe(Layer.provide(hidden), Layer.provide(cashierLive));

  // Sync writes rows straight into SQLite, so it depends on every service whose
  // ref caches those rows — it refreshes each of them after a merge. The layers
  // are already built above; providing them again is how the dependency is
  // declared without re-instantiating the services (and their refs).
  const syncLive = SyncLive.pipe(
    Layer.provide(hidden),
    Layer.provide(SyncTransportLive),
    Layer.provide(
      Layer.mergeAll(
        productLive,
        customerLive,
        supplierLive,
        extraLive,
        methodLive,
        moneyLive,
        socialLive,
      ),
    ),
  );

  return Layer.mergeAll(
    analyticsLive,
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
    zoomLive,
    authLive,
    syncLive,
    hidden,
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
        analytics: yield* AnalyticsService,
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
        store: yield* StoreService,
        supplier: yield* SupplierService,
        transaction: yield* TransactionService,
        zoom: yield* ZoomService,
        auth: yield* AuthService,
        sync: yield* SyncService,
      };
    }).pipe(Effect.provide(live)),
  );
}

export type AppService = ReturnType<typeof makeService>;
