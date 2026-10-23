import { useMemo } from "react";
import { Gate } from "~/components/page-data";
import { TextError } from "~/components/TextError";
import Redirect from "~/components/Redirect";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import { HeaderLoading, TableLoading } from "../z-Loading";
import { useRange } from "../use-range";
import { entriesSource, pageData } from "./data";
import { Header } from "./z-Header";
import { TableList } from "./z-TableList";
import { NewRecord } from "./z-NewRecord";

export default function Page({ pocketId }: { pocketId: string }) {
  const role = useUser().role;
  const { start, endExclusive } = useRange();

  const sources = useMemo(
    () => ({
      pockets: service.money.pockets.get.changes,
      entries: entriesSource(pocketId, start, endExclusive),
    }),
    [pocketId, start, endExclusive],
  );

  if (role !== "admin") return <Redirect to="/" />;

  return (
    <pageData.Provider sources={sources} deps={[pocketId, start, endExclusive]}>
      <Screen pocketId={pocketId} />
    </pageData.Provider>
  );
}

/**
 * The header waits on the pocket (its name, its settings), the table on the
 * entries, and the add button on the pocket. Each is its own key, so a slow
 * ledger cannot hold up the header and a range change does not blank either.
 */
function Screen({ pocketId }: { pocketId: string }) {
  const pockets = pageData.use("pockets");
  const entries = pageData.use("entries");

  const summaries = pockets.type === "success" ? pockets.data : null;
  const pocket = summaries?.find((summary) => summary.pocket.id === pocketId)?.pocket ?? null;
  // A pocket can be deleted from another window, or the URL hand-edited.
  if (summaries !== null && pocket === null) return <NotFound />;

  return (
    <main className="flex flex-col gap-2 w-full p-0.5 mx-auto flex-1 overflow-hidden">
      <Gate
        res={pockets}
        skeleton={<HeaderLoading />}
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ data }) => {
          const found = data.find((summary) => summary.pocket.id === pocketId);
          return found === undefined ? <NotFound /> : <Header pocket={found.pocket} />;
        }}
      </Gate>
      <Gate
        res={entries}
        skeleton={<TableLoading cols={pocket?.type === "change" ? 8 : 7} />}
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ data }) => (pocket === null ? null : <TableList money={data} type={pocket.type} />)}
      </Gate>
      {pocket === null ? null : <NewRecord pocket={pocket} />}
    </main>
  );
}
