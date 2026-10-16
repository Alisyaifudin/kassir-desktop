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
import { InfoService } from "./info";
import { InfoLive } from "./info/live";
import { LocalStorageLive } from "./local-storage/live";
import { MethodService } from "./method";
import { MethodLive } from "./method/live";
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

/** Layers that back the public services but are not exposed on `service`. */
const hiddenLive = Layer.mergeAll(DatabaseLive, LocalStorageLive, StoreLive);

const cashierLive = CashierLive.pipe(Layer.provide(hiddenLive));
const configLive = ConfigLive.pipe(Layer.provide(hiddenLive));
const customerLive = CustomerLive.pipe(Layer.provide(hiddenLive));
const infoLive = InfoLive.pipe(Layer.provide(hiddenLive));
const methodLive = MethodLive.pipe(Layer.provide(hiddenLive));
const moneyLive = MoneyLive.pipe(Layer.provide(hiddenLive));
const productLive = ProductLive.pipe(Layer.provide(hiddenLive));
const printerLive = PrinterLive.pipe(Layer.provide(hiddenLive));
const socialLive = SocialLive.pipe(Layer.provide(hiddenLive));
// `record` reverses a deleted record's stock movement, so it needs `product`.
const recordLive = RecordLive.pipe(Layer.provide(hiddenLive), Layer.provide(productLive));

// Auth also needs the cashier service to verify the session's id.
const authLive = AuthLive.pipe(Layer.provide(hiddenLive), Layer.provide(cashierLive));

const appLive = Layer.mergeAll(
  configLive,
  cashierLive,
  customerLive,
  infoLive,
  methodLive,
  moneyLive,
  printerLive,
  productLive,
  recordLive,
  socialLive,
  authLive,
);

export const service = Effect.runSync(
  Effect.gen(function* () {
    return {
      config: yield* ConfigService,
      cashier: yield* CashierService,
      customer: yield* CustomerService,
      info: yield* InfoService,
      method: yield* MethodService,
      money: yield* MoneyService,
      printer: yield* PrinterService,
      product: yield* ProductService,
      record: yield* RecordService,
      social: yield* SocialService,
      auth: yield* AuthService,
    };
  }).pipe(Effect.provide(appLive)),
);
