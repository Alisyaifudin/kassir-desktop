import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { CashierService } from "~/services/cashier";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { cashierListEffect } from "./effect-cashierList";
import { newCashierEffect } from "./effect-newCashier";

const page = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const loader = cashierService.loader;
  const CashierList = yield* cashierListEffect;
  const NewCashier = yield* newCashierEffect;
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
          <CashierList />
          <NewCashier />
        </StateWrap>
      </main>
    );
  };
});

export default page;
