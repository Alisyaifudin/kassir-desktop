import { TextError } from "~/components/TextError";
import { User } from "~/lib/auth";
import { CashierWithoutPassword } from "~/database/old/cashier";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { Loading } from "~/components/Loading";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Item } from "./Item";
import { NewCashier } from "./NewCashier";
import { Size } from "~/lib/store-old";

export default function Page() {
  const { user, cashiers, size } = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Kasir</h2>
      <Suspense fallback={<Loading />}>
        <Cashier size={size} user={user} cashiers={cashiers} />
      </Suspense>
      <NewCashier size={size} />
    </div>
  );
}

function Cashier({
  cashiers: promise,
  user,
  size,
}: {
  cashiers: Promise<Result<"Aplikasi bermasalah", CashierWithoutPassword[]>>;
  user: User;
  size: Size;
}) {
  const [errMsg, cashiers] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return (
    <>
      {cashiers.map((cashier) => (
        <Item size={size} key={cashier.name} cashier={cashier} username={user.name} />
      ))}
    </>
  );
}
