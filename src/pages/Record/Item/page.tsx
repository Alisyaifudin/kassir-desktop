import { isRefetching, Loader, useDelayedFlag } from "~/components/Loader";
import { NotFound } from "~/components/NotFound";
import { useRecordFull } from "../z-Detail/use-record-full";
import { ItemErrorBoundary, ItemErrorFallback } from "./z-Error";
import { Loading } from "./z-Loading";
import { Views } from "./z-Views";

export default function Page({ recordId }: { recordId: string }) {
  const res = useRecordFull(recordId);
  // An edit makes the record re-read itself. Fading both faces meanwhile keeps the
  // version just replaced from being worked on; the first load is `Loader`'s job,
  // so this is never true then.
  const busy = useDelayedFlag(isRefetching(res));
  return (
    <main className="flex flex-col gap-2 p-2 h-full overflow-hidden">
      <ItemErrorBoundary fallback={ItemErrorFallback}>
        <Loader res={res} fallback={<Loading />}>
          {({ data: record }) =>
            record === null ? <NotFound /> : <Views record={record} busy={busy} />
          }
        </Loader>
      </ItemErrorBoundary>
    </main>
  );
}
