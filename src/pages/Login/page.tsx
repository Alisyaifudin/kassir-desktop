import { ErrorComponent } from "~/components/ErrorComponent";
import { CashierService } from "~/services/cashier";
import { Effect } from "effect";
import { WithLoader } from "~/components/WithLoader";
import { Loading } from "./z-Loading";
import { UserService } from "~/services/user";
import { HashService } from "~/services/hash";
import { FreshForm } from "./z-FreshForm";
import { LoginForm } from "./z-LoginForm";

const page = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const hashService = yield* HashService;
  const userService = yield* UserService;
  const onAdd = (name: string, password: string) =>
    cashierService.add({ name, password, role: "admin" });
  const onCheck = (id: string, password: string) =>
    Effect.gen(function* () {
      const { hash, ...user } = yield* cashierService.get.byId(id);
      yield* hashService.verify(password, hash);
      return user;
    });
  return function Page() {
    return (
      <main className="flex justify-center items-center">
        <WithLoader
          loader={cashierService.get.all}
          loading={<Loading />}
          error={({ e }) => (
            <ErrorComponent title="Aplikasi bermasalah ☠">{e.message}</ErrorComponent>
          )}
        >
          {(cashiers) =>
            cashiers.length === 0 ? (
              <FreshForm login={userService.login} onAdd={onAdd} />
            ) : (
              <LoginForm cashiers={cashiers} login={userService.login} onCheck={onCheck} />
            )
          }
        </WithLoader>
      </main>
    );
  };
});

export default page;
