import { Button } from "~/components/ui/button";
import { Temporal } from "temporal-polyfill";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Effect } from "effect";
import { RecordService } from "~/services/record";
import { BlobService } from "~/services/blob";
import { IoService } from "~/services/io";
import { useMemo, useState } from "react";
import { DateRangePicker } from "~/components/CalendarPicker/DateRangePicker";
import { tz } from "~/lib/constants";

export const recordDownload = Effect.gen(function* () {
  const recordService = yield* RecordService;
  const ioService = yield* IoService;
  const blobService = yield* BlobService;
  const save = (start: number, end: number) =>
    program(start, end).pipe(
      Effect.provideService(RecordService, recordService),
      Effect.provideService(IoService, ioService),
      Effect.provideService(BlobService, blobService),
    );
  return function RecordDownload() {
    const { loading, error, handleSubmit, range, setRange } = useRecord(save);
    return (
      <div className="flex gap-2 flex-col p-2 ">
        <div className="flex gap-2 items-center justify-between ">
          <h3 className="italic text-normal font-bold">Riwayat</h3>
        </div>
        <form onSubmit={handleSubmit} className="text-2xl flex justify-between items-end">
          <input type="hidden" name="action" value="record"></input>
          <div className="flex gap-3 items-end">
            <DateRangePicker range={range} setRange={setRange} />
          </div>
          <Button>
            Unduh <Spinner when={loading} />
          </Button>
        </form>
        <TextError>{error}</TextError>
      </div>
    );
  };
});

//========================================================
//========================================================
//========================================================

export function getDefaultInterval() {
  const today = Temporal.Now.plainDateISO();
  const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
  return [lastMonth, today] as [Temporal.PlainDate, Temporal.PlainDate];
}

export function useRecord(save: (start: number, end: number) => Effect.Effect<string | null>) {
  const defaultInterval = useMemo(() => {
    return getDefaultInterval();
  }, []);
  const [range, setRange] = useState(defaultInterval);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const start = range[0].toZonedDateTime(tz).startOfDay().epochMilliseconds;
    const end = range[1]
      .add(Temporal.Duration.from({ days: 1 }))
      .toZonedDateTime(tz)
      .startOfDay().epochMilliseconds;
    const errMsg = await Effect.runPromise(save(start, end));
    setLoading(false);
    setError(errMsg);
  }
  return { range, setRange, handleSubmit, loading, error };
}

function program(start: number, end: number) {
  return Effect.gen(function* () {
    const recordService = yield* RecordService;
    const blobService = yield* BlobService;
    const ioService = yield* IoService;
    const records = yield* recordService.get.range(start, end);
    const data = yield* blobService.convert.fromObject(records);
    const name = `record_${start}_${end}.json`;
    const filePath = yield* ioService.dialog({
      title: "Simpan Data Riwayat",
      defaultPath: name,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    yield* ioService.save(filePath, data);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      return Effect.succeed(e.message);
    }),
  );
}
