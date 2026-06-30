import { useCallback, useEffect, useRef, useState } from "react";
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

export const recordUpload = Effect.gen(function* () {
  const recordService = yield* RecordService;
  return function RecordUpload() {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-normal font-bold mb-2">Riwayat</h3>
          <SchemaDialog />
        </div>
        <UploadInput extract={extractRecord}>
          {(records) => <UploadedEntries records={records} add={recordService.add.external} />}
        </UploadInput>
      </div>
    );
  };
});

function UploadedEntries({
  records,
  add,
}: {
  records: RecordFull[];
  add: (record: RecordFull) => Effect.Effect<void, RecordError | RecordAlreadyExistError>;
}) {
  const startedRef = useRef(false);
  const [progress, setProgress] = useState<
    (
      | { state: "pending"; id: string; paidAt: number }
      | {
          state: "error";
          id: string;
          paidAt: number;
          error: RecordError | RecordAlreadyExistError | DuplicateError;
        }
      | { state: "success"; id: string; paidAt: number }
    )[]
  >(() => records.map((r) => ({ state: "pending", id: r.id, paidAt: r.paidAt })));

  const init = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const insertedSet = new Set<string>();
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (insertedSet.has(record.id)) {
        setProgress((prev) => {
          const next = [...prev];
          next[i] = {
            state: "error",
            id: record.id,
            paidAt: record.paidAt,
            error: DuplicateError.new(
              `Duplikat. Riwayat dengan id: ${record.id} sudah dimasukkan.`,
            ),
          };
          return next;
        });
        continue;
      }
      const error = await Effect.runPromise(
        add(record).pipe(
          Effect.as(null),
          Effect.catchAll((e) => Effect.succeed(e)),
        ),
      );
      setProgress((prev) => {
        const next = [...prev];
        if (error) {
          next[i] = { state: "error", id: record.id, paidAt: record.paidAt, error };
        } else {
          insertedSet.add(record.id);
          next[i] = { state: "success", id: record.id, paidAt: record.paidAt };
        }
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  if (records.length === 0) return null;

  const firstPendingIndex = progress.findIndex((p) => p.state === "pending");

  return (
    <ol className="mt-4 space-y-2">
      {progress.map((item, i) => {
        if (item.state === "pending" && i !== firstPendingIndex) return null;
        return (
          <li key={item.id} className="flex flex-col gap-1 text-small">
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
                {item.id} &mdash; {formatEpochtime(item.paidAt)}
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
