import { useMemo } from "react";
import { useSelected } from "~/hooks/use-selected";
import type { RecordFull } from "~/services/record";
import type { DayRecord, LineClassification } from "~/services/report";
import { detailSources, pageData, type Categories } from "./data";
import { Identity } from "./z-Identity";
import { KategoriExtras } from "./z-Extras";
import { KategoriListings } from "./z-Listings";
import { OutOfScope } from "./z-OutOfScope";
import { PaneSkeleton } from "../z-Loading";
import { ReportErrorFallback } from "../z-Error";

/**
 * The classifier for one record: its goods and its charges, each line carrying the
 * category it means.
 *
 * Selecting another record is a *refetch*, not a remount — `deps` keeps the
 * previous preview on screen while the next is read, which is what makes walking
 * a day with `‹ ›` feel like turning a page rather than flashing a skeleton 150
 * times. The same trick `Record/z-Detail` uses for its preview pane.
 */
export function Wizard({
  records,
  recordId,
  categories,
}: {
  records: DayRecord[];
  recordId: string;
  categories: Categories;
}) {
  const sources = useMemo(() => detailSources(recordId), [recordId]);

  return (
    <pageData.Provider sources={sources} deps={[recordId]}>
      <pageData.Gate
        keys={["record", "lines"]}
        pulse={<PaneSkeleton />}
        error={(error) => <ReportErrorFallback error={error} />}
      >
        {({ record, lines }) =>
          record === null ? null : (
            <Body
              record={record}
              lines={lines}
              records={records}
              categories={categories}
            />
          )
        }
      </pageData.Gate>
    </pageData.Provider>
  );
}

function Body({
  record,
  lines,
  records,
  categories,
}: {
  record: RecordFull;
  lines: LineClassification[];
  records: DayRecord[];
  categories: Categories;
}) {
  const [, setSelected] = useSelected();

  const byLine = useMemo(
    () => new Map(lines.map((line) => [line.lineId, line] as const)),
    [lines],
  );
  // A line classified against an older version of the record: the category may no
  // longer describe what it classified. Reported per record, and per day by the
  // counter.
  const stale = lines.some((line) => line.sourceRev !== record.updatedAt);

  const index = records.findIndex((row) => row.id === record.id);
  const previous = index > 0 ? records[index - 1] : undefined;
  const next = index >= 0 && index < records.length - 1 ? records[index + 1] : undefined;

  const empty = record.listings.length === 0 && record.extras.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Identity
        record={record}
        index={Math.max(index, 0)}
        total={records.length}
        stale={stale}
        onPrevious={previous === undefined ? null : () => setSelected(previous.id)}
        onNext={next === undefined ? null : () => setSelected(next.id)}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1 pr-2">
        {empty ? <OutOfScope /> : null}
        {record.listings.length > 0 ? (
          <KategoriListings record={record} byLine={byLine} categories={categories} />
        ) : null}
        {record.extras.length > 0 ? (
          <KategoriExtras record={record} byLine={byLine} categories={categories} />
        ) : null}
      </div>
    </div>
  );
}
