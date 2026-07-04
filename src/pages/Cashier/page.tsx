import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { CashierList } from "./z-CashierList";
import { NewCashier } from "./z-NewCashier";
import { UserService } from "~/services/user";

const page = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const userService = yield* UserService;
  const add = (name: string) =>
    Effect.runPromise(
      cashierService.add({ name, role: "user", password: "" }).pipe(
        Effect.as(null),
        Effect.catchAll((e) => Effect.succeed(e.e.message)),
      ),
    );
  return function Page() {
    return (
      <main className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Daftar Kasir</h1>
          <p className="text-muted-foreground text-normal">Kelola akun kasir dan peran pengguna</p>
        </div>
        <StateWrap
          loader={cashierService.loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <CashierList
            onDelete={cashierService.delete}
            onUpdateName={cashierService.set.name}
            onUpdateRole={cashierService.set.role}
            useCashiers={cashierService.useCashiers}
            useUser={userService.useUser}
          />
          <NewCashier onAdd={add} />
        </StateWrap>
      </main>
    );
  };
});

export default page;
