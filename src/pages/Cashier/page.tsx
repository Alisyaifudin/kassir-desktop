import { TextError } from "~/components/TextError";
import { Item } from "./z-Item";
import { NewCashier } from "./z-NewCashier";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <main className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Daftar Kasir</h1>
        <p className="text-muted-foreground text-normal">Kelola akun kasir dan peran pengguna</p>
      </div>

      <div className="flex flex-col gap-2">
        <Cashier />
      </div>

      <NewCashier />
    </main>
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
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center p-3 gap-3 rounded-xl bg-muted/30 animate-pulse"
        >
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
