import { ErrorComponent } from "~/components/ErrorComponent";
import { CashierService } from "~/services/cashier";
import { Effect } from "effect";
import { createLoader, StaticLoader } from "~/components/Loader";
import { LogPut, LogService } from "~/services/log";
import { freshForm } from "./effect-freshForm";
import { loginForm } from "./effect-loginForm";

export const page = Effect.gen(function* () {
  const cashier = yield* CashierService;
  const log = yield* LogService;
  const loader = createLoader(
    program.pipe(
      Effect.provideService(CashierService, cashier),
      Effect.provideService(LogService, log),
    ),
  );
  const FreshForm = yield* freshForm;
  const LoginForm = yield* loginForm;
  return function Page() {
    return (
      <StaticLoader
        loader={loader}
        error={({ e }) => (
          <ErrorComponent title="Aplikasi bermasalah ☠">{e.message}</ErrorComponent>
        )}
      >
        {(cashiers) => (cashiers.length === 0 ? <FreshForm /> : <LoginForm cashiers={cashiers} />)}
      </StaticLoader>
    );
  };
});

const program = Effect.gen(function* () {
  const cashier = yield* CashierService;
  return yield* cashier.get.all;
}).pipe(Effect.tapError(LogPut));

export default page;
