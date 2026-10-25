import { useMemo } from "react";
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
 * The screen is *about* one pocket: which pocket, and what kind, comes from the
 * `pockets` read — so that read gates the screen, and the ledger gates itself
 * inside it. Nesting them keeps the entries from waiting on anything but their
 * own key, while the table's column shape can still be measured from the pocket
 * the header already showed.
 */
function Screen({ pocketId }: { pocketId: string }) {
  return (
    <main className="flex flex-col gap-2 w-full p-0.5 mx-auto flex-1 overflow-hidden">
      <pageData.Gate
        keys={["pockets"]}
        pulse={
          <>
            <HeaderLoading />
            <TableLoading />
          </>
        }
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ pockets }) => {
          // A pocket can be deleted from another window, or the URL hand-edited.
          const pocket = pockets.find((summary) => summary.pocket.id === pocketId)?.pocket;
          if (pocket === undefined) return <NotFound />;

          return (
            <>
              <Header pocket={pocket} />
              <pageData.Gate
                keys={["entries"]}
                // Its placeholder is already on screen from the pocket's pulse, so
                // there is nothing to hold back — only its shape may sharpen.
                delay={0}
                pulse={<TableLoading cols={pocket.type === "change" ? 8 : 7} />}
                error={(error) => <TextError>{error.message}</TextError>}
              >
                {({ entries }) => <TableList money={entries} type={pocket.type} />}
              </pageData.Gate>
              <NewRecord pocket={pocket} />
            </>
          );
        }}
      </pageData.Gate>
    </main>
  );
}
