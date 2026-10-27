import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import { pageData } from "./data";
import { Item } from "./z-Item";
import { NewCashier } from "./z-NewCashier";

/** Static head and add button; the list is the only key. */
export default function Page() {
  return (
    <pageData.Provider sources={{ cashiers: service.cashier.get.changes }}>
      <main className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Daftar Kasir</h1>
          <p className="text-muted-foreground text-base">Kelola akun kasir dan peran pengguna</p>
        </div>

        <div className="flex flex-col gap-2">
          <CashierList />
        </div>
        <NewCashier />
      </main>
    </pageData.Provider>
  );
}

function CashierList() {
  return (
    <pageData.Gate
      keys={["cashiers"]}
      pulse={<LoadingList />}
      error={(error) => <TextError>{`Daftar kasir bermasalah: ${error.message}`}</TextError>}
    >
      {({ cashiers }) => (
        <>
          {cashiers.map((cashier) => (
            <Item key={cashier.id} cashier={cashier} />
          ))}
        </>
      )}
    </pageData.Gate>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat kasir">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_140px_40px] items-center p-3 gap-3 rounded-xl bg-muted/30"
        >
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
