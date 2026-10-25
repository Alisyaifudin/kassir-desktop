import { useMemo } from "react";
import type { RecordFull } from "~/services/record";
import { useUnselect } from "../use-selected";
import { RecordsErrorFallback } from "../z-Error";
import { Ledger } from "./z-Ledger";
import { DetailSkeleton } from "./z-Loading";
import { detailSources, pageData } from "./data";
import { Identity } from "./z-Identity";
import { Lihat } from "./z-Lihat";
import { Shelf } from "./z-Shelf";

/**
 * The record picked in the day's list, read through the same ledger the full page
 * reads — identity, goods, charges, parties, then the band that closes it — so the
 * two faces cannot say different things about one record.
 *
 * What the pane leaves out is every correction. Nothing here edits a record: no
 * dates, no note, no payment. Its identity band closes the preview on the left and
 * opens the full page on the right (`Lihat`), where those corrections live; its
 * shelf holds the money and the two ways on from it.
 */
export function Detail({ recordId }: { recordId: string }) {
  const sources = useMemo(() => detailSources(recordId), [recordId]);

  return (
    // `deps` makes selecting another record a *refetch*: the previous preview
    // stays on screen while the next one is read, exactly as `keepPrevious` did.
    <pageData.Provider sources={sources} deps={[recordId]}>
      <pageData.Gate
        keys={["record"]}
        pulse={<DetailSkeleton close />}
        error={(error) => <RecordsErrorFallback error={error} />}
      >
        {({ record }) => (record === null ? null : <Body record={record} />)}
      </pageData.Gate>
    </pageData.Provider>
  );
}

function Body({ record }: { record: RecordFull }) {
  const unselect = useUnselect();
  return (
    <Ledger
      record={record}
      identity={
        <Identity
          record={record}
          onClose={unselect}
          action={<Lihat recordId={record.id} />}
        />
      }
      shelf={<Shelf record={record} />}
    />
  );
}
