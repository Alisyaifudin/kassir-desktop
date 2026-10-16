import { Loader } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { Summary } from "./z-Summary";
import { DebtTable } from "./z-DebtTable.tsx";
import { DebtErrorBoundary, DebtErrorFallback } from "./z-Error";
import { useData } from "./use-data";
import { totalDebt } from "./util-debt";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 h-full  overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Utang</h1>
        <p className="text-muted-foreground text-normal">
          Pantau dan kelola catatan utang pelanggan
        </p>
      </div>
      <Content />
    </div>
  );
}

function Content() {
  const res = useData();
  return (
    <DebtErrorBoundary fallback={DebtErrorFallback}>
      <Loader res={res} fallback={<Loading />}>
        {({ data: records }) => (
          <>
            <Summary total={totalDebt(records)} />
            <div className="flex flex-col gap-2 py-1 flex-1  overflow-hidden">
              <DebtTable records={records} />
            </div>
          </>
        )}
      </Loader>
    </DebtErrorBoundary>
  );
}
