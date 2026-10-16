import { CashierCheckbox } from "./z-CashierCheckbox";
import { SelectSize } from "./z-SelectSize";
import { Info } from "./z-Info";
import { InfoErrorBoundary, InfoErrorFallback } from "./z-Error";
import { Loader, useStream } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";

export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1 w-full overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Pengaturan Toko</h1>
        <p className="text-muted-foreground text-normal">Kelola identitas dan preferensi toko</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Wrapper />
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <SelectSize />
      </div>
    </div>
  );
}

function Wrapper() {
  const res = useStream(service.info.changes);
  return (
    <InfoErrorBoundary fallback={InfoErrorFallback}>
      <Loader res={res} fallback={<Loading />}>
        {({ data: info }) => (
          <>
            <Info owner={info.owner} address={info.address} header={info.header} footer={info.footer} />
            <CashierCheckbox showCashier={info.showCashier} />
          </>
        )}
      </Loader>
    </InfoErrorBoundary>
  );
}

function Loading() {
  return (
    <>
      <div className="flex flex-col gap-2 p-0.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-[160px_1fr] small:grid-cols-[100px_1fr] text-normal items-center gap-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-1 p-0.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
    </>
  );
}
