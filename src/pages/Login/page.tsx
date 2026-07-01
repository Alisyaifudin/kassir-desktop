import { ErrorComponent } from "~/components/ErrorComponent";
import { CashierService } from "~/services/cashier";
import { Effect } from "effect";
import { freshForm } from "./effect-freshForm";
import { loginForm } from "./effect-loginForm";
import { WithLoader } from "~/components/WithLoader";
import { Loading } from "./z-Loading";

const page = Effect.gen(function* () {
  const cashier = yield* CashierService;
  const FreshForm = yield* freshForm;
  const LoginForm = yield* loginForm;
  return function Page() {
    return (
      <WithLoader
        loader={cashier.get.all}
        loading={<Loading />}
        error={({ e }) => (
          <ErrorComponent title="Aplikasi bermasalah ☠">{e.message}</ErrorComponent>
        )}
      >
        {(cashiers) => (cashiers.length === 0 ? <FreshForm /> : <LoginForm cashiers={cashiers} />)}
      </WithLoader>
    );
  };
});

export default page;
