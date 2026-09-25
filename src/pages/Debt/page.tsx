import { useData } from "./use-data";
import { Summary } from "./z-Summary";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Loading as LoadingIndicator } from "~/components/Loading";
import { DebtTable } from "./z-DebtTable.tsx";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 h-full  overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Utang</h1>
        <p className="text-muted-foreground text-normal">
          Pantau dan kelola catatan utang pelanggan
        </p>
      </div>
      <Summary />
      <div className="flex flex-col gap-2 py-1 flex-1  overflow-hidden">
        <Wrapper />
      </div>
    </div>
  );
}

function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(records) {
      return <DebtTable records={records} />;
    },
  });
}

function Loading() {
  return <LoadingIndicator />;
}
