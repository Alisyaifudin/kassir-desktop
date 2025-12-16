import { TextError } from "~/components/TextError";
import { auth } from "~/lib/auth";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { Loading } from "~/components/Loading";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Item } from "./Item";
import { NewCashier } from "./NewCashier";
import { Cashier as CashierDB } from "~/database/cashier/get-all";

export default function Page() {
  const cashiers = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Kasir</h2>
      <Suspense fallback={<Loading />}>
        <Cashier cashiers={cashiers} />
      </Suspense>
      <NewCashier />
    </div>
  );
}

function Cashier({
  cashiers: promise,
}: {
  cashiers: Promise<Result<"Aplikasi bermasalah", CashierDB[]>>;
}) {
  const [errMsg, cashiers] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  const username = auth.user().name;
  return (
    <>
      {cashiers.map((cashier) => (
        <Item key={cashier.name} cashier={cashier} username={username} />
      ))}
    </>
  );
}
