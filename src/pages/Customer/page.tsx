import { Item } from "./z-Item";
import { NewCustomer } from "./z-NewCustomer";
import { Skeleton } from "~/components/ui/skeleton";
import { Loader, useStream } from "~/components/Loader";
import { service } from "~/services";
import { CustomerErrorBoundary, CustomerErrorFallback } from "./z-Error";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Daftar Pelanggan</h1>
        <p className="text-muted-foreground text-normal">Kelola informasi pelanggan dan kontak</p>
      </div>
      <Customers />
      <NewCustomer />
    </div>
  );
}

function Customers() {
  const res = useStream(service.customer.get.changes);
  return (
    <CustomerErrorBoundary fallback={CustomerErrorFallback}>
      <Loader res={res} fallback={<LoadingList />}>
        {({ data: customers }) => (
          <>
            {customers.map((customer) => (
              <Item key={customer.id} customer={customer} />
            ))}
          </>
        )}
      </Loader>
    </CustomerErrorBoundary>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center p-3 gap-2 rounded-xl bg-muted/30 animate-pulse"
        >
          <div className="grid grid-cols-[1fr_1fr_35px] items-center gap-3 w-full">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full justify-self-end" />
          </div>
          <Skeleton className="h-3 w-48 self-start rounded" />
        </div>
      ))}
    </div>
  );
}
