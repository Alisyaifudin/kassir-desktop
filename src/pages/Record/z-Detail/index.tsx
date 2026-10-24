import { Gate } from "~/components/page-data";
import type { RecordFull } from "~/services/record";
import { useUnselect } from "../use-selected";
import { RecordsErrorFallback } from "../z-Error";
import { Ledger } from "./z-Ledger";
import { useRecordFull } from "./use-record-full";
import { DetailSkeleton } from "./z-Loading";
import { Identity } from "./z-Identity";
import { Shelf } from "./z-Shelf";

/**
 * The record picked in the day's list, read through the same ledger the full page
 * reads — identity, goods, charges, parties, then the band that closes it — so the
 * two faces cannot say different things about one record.
 *
 * What the pane leaves out is every correction. Nothing here edits a record: no
 * dates, no note, no payment. Its shelf holds the money and the ways out
 * (`Lihat`, `Jadikan Transaksi`, `Hapus`), and its identity band carries the close
 * button where the page has its date pickers.
 */
export function Detail({ recordId }: { recordId: string }) {
  const res = useRecordFull(recordId);
  return (
    <Gate
      res={res}
      skeleton={<DetailSkeleton close />}
      error={(error) => <RecordsErrorFallback error={error} />}
    >
      {({ data: record }) => (record === null ? null : <Body record={record} />)}
    </Gate>
  );
}

function Body({ record }: { record: RecordFull }) {
  const unselect = useUnselect();
  return (
    <Ledger
      record={record}
      identity={<Identity record={record} onClose={unselect} />}
      shelf={<Shelf record={record} />}
    />
  );
}
