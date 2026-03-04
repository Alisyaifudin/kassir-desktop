import { TextError } from "~/components/TextError";
import { LoadingBig } from "~/components/Loading";
import { Item } from "./z-Item";
import { NewCashier } from "./z-NewCashier";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-auto">
      <h2 className="text-big font-bold">Daftar Kasir</h2>
      <Cashier />
      <NewCashier />
    </div>
  );
}

function Cashier() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(cashiers) {
      return (
        <>
          {cashiers.map((cashier) => (
            <Item key={cashier.name} cashier={cashier} />
          ))}
        </>
      );
    },
  });
}
