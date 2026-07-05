import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { CashierList } from "./z-CashierList";
import { NewCashier } from "./z-NewCashier";
import { UserService } from "~/services/user";
import { promisify } from "~/lib/promisify";

const page = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const userService = yield* UserService;
  const onAdd = (name: string) =>
    promisify(
      () => cashierService.add({ name, role: "user", password: "" }),
      (e) => e.e.message,
    );
  const onDelete = (id: string) =>
    promisify(
      () => cashierService.delete(id),
      (e) => e.e.message,
    );
  const onUpdateName = (id: string, name: string) =>
    promisify(
      () => cashierService.set.name(id, name),
      (e) => e.e.message,
    );
  const onUpdateRole = (id: string, role: DBNamespace.Role) =>
    promisify(
      () => cashierService.set.role(id, role),
      (e) => e.e.message,
    );
  const loader = () => cashierService.loader();
  const useCashiers = () => cashierService.useCashiers();
  const useUser = () => userService.useUser();

  return function Page() {
    return (
      <main className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Daftar Kasir</h1>
          <p className="text-muted-foreground text-normal">Kelola akun kasir dan peran pengguna</p>
        </div>
        <StateWrap
          loader={loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <CashierList
            onDelete={onDelete}
            onUpdateName={onUpdateName}
            onUpdateRole={onUpdateRole}
            useCashiers={useCashiers}
            useUser={useUser}
          />
          <NewCashier onAdd={onAdd} />
        </StateWrap>
      </main>
    );
  };
});

export default page;
