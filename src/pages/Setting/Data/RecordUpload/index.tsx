import { SchemaDialog } from "./z-Schema";
import { UploadInput } from "~/components/UploadInput";
import { RecordFull } from "~/services/record/type";
import { Effect } from "effect";
import { RecordAlreadyExistError, RecordError } from "~/services/record/error";
import { RecordService } from "~/services/record";
import { extractRecord } from "./util-validate-record";
import { DuplicateError } from "~/lib/error-effect";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatDate, formatEpochtime } from "~/lib/date";
import { Temporal } from "temporal-polyfill";
import { useUploadProgress } from "~/components/UploadProgress";

export const recordUpload = Effect.gen(function* () {
  const recordService = yield* RecordService;
  const add = (record: RecordFull) => recordService.add.external(record);
  return function RecordUpload() {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-normal font-bold mb-2">Riwayat</h3>
          <SchemaDialog />
        </div>
        <UploadInput extract={extractRecord}>
          {(records) => <UploadedEntries records={records} add={add} />}
        </UploadInput>
      </div>
    );
  };
});

type RecordError_ = RecordError | RecordAlreadyExistError;

function UploadedEntries({
  records,
  add,
}: {
  records: RecordFull[];
  add: (record: RecordFull) => Promise<null | RecordError_>;
}) {
  const progress = useUploadProgress({
    items: records,
    getId: (r) => r.id,
    add,
  });

  if (records.length === 0) return null;

  const firstPendingIndex = progress.findIndex((p) => p.state === "pending");

  return (
    <ol className="mt-4 space-y-2">
      {progress.map((item, i) => {
        if (item.state === "pending" && i !== firstPendingIndex) return null;
        return (
          <li key={item.item.id} className="flex flex-col gap-1 text-small">
            <div className="flex items-center gap-2">
              <span>{i + 1}.</span>
              {item.state === "success" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : item.state === "error" ? (
                <XCircle className="w-4 h-4 text-destructive shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <span>
                {item.item.id} &mdash; {formatEpochtime(item.item.paidAt, {date: "long", time: "long"})}
              </span>
            </div>
            {item.state === "error" && <ErrorComp error={item.error} />}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorComp({ error }: { error: RecordError | RecordAlreadyExistError | DuplicateError }) {
  switch (error._tag) {
    case "DuplicateError":
      return <span className="text-destructive truncate">{error.e.message}</span>;
    case "RecordAlreadyExistError":
      return (
        <span className="text-amber-600 truncate">
          Sudah ada —{" "}
          <span className="font-medium">
            {formatDate(
              new Temporal.PlainDate(
                new Date(error.existing.paidAt).getFullYear(),
                new Date(error.existing.paidAt).getMonth() + 1,
                new Date(error.existing.paidAt).getDate(),
              ),
            )}
          </span>{" "}
          <span className="text-muted-foreground">({error.existing.id})</span> sudah terdaftar
        </span>
      );
    case "RecordError":
      return <span className="text-destructive truncate">{error.e.message}</span>;
  }
}
