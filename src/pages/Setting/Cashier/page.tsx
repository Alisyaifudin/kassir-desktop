import { TextError } from "~/components/TextError";
import { Item } from "./z-Item";
import { NewCashier } from "./z-NewCashier";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

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
      return <LoadingList />;
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

function LoadingList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center px-0.5 gap-3"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-10" />
        </div>
      ))}
    </div>
  );
}
