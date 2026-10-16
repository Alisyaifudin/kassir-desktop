import { Loader, useStream } from "~/components/Loader";
import Redirect from "~/components/Redirect";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { Pocket } from "~/services/money";
import { MoneyErrorBoundary, MoneyErrorFallback } from "../z-Error";
import { TableLoading } from "../z-Loading";
import { useData } from "./use-data";
import { Header } from "./z-Header";
import { TableList } from "./z-TableList";
import { DeletePocketBtn } from "./z-DeletePocket";
import { Download } from "./z-Download";
import { UploadMoney } from "./z-UploadDialog";

export default function Page({ pocketId }: { pocketId: string }) {
  const role = useUser().role;
  if (role !== "admin") return <Redirect to="/" />;

  return (
    <MoneyErrorBoundary fallback={MoneyErrorFallback}>
      <PocketPage pocketId={pocketId} />
    </MoneyErrorBoundary>
  );
}

function PocketPage({ pocketId }: { pocketId: string }) {
  const res = useStream(service.money.pockets.get.changes);
  return (
    <Loader res={res} fallback={<TableLoading />}>
      {({ data: summaries }) => {
        // A pocket can be deleted from another window, or the URL hand-edited.
        const found = summaries.find((summary) => summary.pocket.id === pocketId);
        if (found === undefined) return <NotFound />;
        return <History pocket={found.pocket} />;
      }}
    </Loader>
  );
}

function History({ pocket }: { pocket: Pocket }) {
  const res = useData(pocket.id);
  return (
    <main className="flex flex-col gap-2 w-full p-0.5 mx-auto flex-1 overflow-hidden">
      <Header pocket={pocket} />
      <Loader res={res} fallback={<TableLoading />}>
        {({ data: money }) => (
          <>
            <TableList money={money} type={pocket.type} />
            <div className="flex items-center pb-1 justify-between">
              <DeletePocketBtn pocketId={pocket.id} />
              <div className="flex items-center gap-2">
                <UploadMoney pocketId={pocket.id} />
                <Download pocket={pocket} />
              </div>
            </div>
          </>
        )}
      </Loader>
    </main>
  );
}
