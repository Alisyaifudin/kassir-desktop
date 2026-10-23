import { Gate } from "~/components/page-data";
import { Skeleton } from "~/components/ui/skeleton";
import { Summary } from "./z-Summary";
import { DebtTable } from "./z-DebtTable.tsx";
import { DebtErrorFallback } from "./z-Error";
import { useData } from "./use-data";
import { totalDebt } from "./util-debt";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 h-full  overflow-hidden">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-normal">
          Pantau dan kelola catatan utang pelanggan
        </p>
      </div>
      <Content />
    </div>
  );
}

/** The summary and the debt table, in place, while the credits load. */
function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" aria-busy="true" aria-label="Memuat utang">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function Content() {
  const res = useData();
  return (
    <Gate
      res={res}
      skeleton={<Loading />}
      error={(error) => <DebtErrorFallback error={error} />}
    >
      {({ data: records }) => (
        <>
          <Summary total={totalDebt(records)} />
          <div className="flex flex-col gap-2 py-1 flex-1  overflow-hidden">
            <DebtTable records={records} />
          </div>
        </>
      )}
    </Gate>
  );
}
