import { CashierCheckbox } from "./z-CashierCheckbox";
import { Info } from "./z-Info";
import { InfoErrorBoundary, InfoErrorFallback } from "./z-Error";
import { Loader, useStream } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";

const item = navItemOf("/setting/shop");

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
      <PageHeader title={item.label} description={item.description} />
      <Panel title="Identitas Toko">
        <Wrapper />
      </Panel>
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
            <Info
              owner={info.owner}
              address={info.address}
              header={info.header}
              footer={info.footer}
            />
            <CashierCheckbox showCashier={info.showCashier} />
          </>
        )}
      </Loader>
    </InfoErrorBoundary>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-4">
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
        </div>
      ))}
    </div>
  );
}
