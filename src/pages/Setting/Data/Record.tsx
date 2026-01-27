import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "~/lib/date";
import { useSubmit } from "~/hooks/use-submit";
import { Effect, pipe } from "effect";
import { program } from "./util-record";
import { log } from "~/lib/utils";

export default function Record() {
  const { startOfMonth, endOfMonth } = useDateInterval();
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      const formdata = new FormData(e.currentTarget);
      return pipe(
        program(formdata).pipe(
          Effect.catchTag("DbError", ({ e }) => {
            log.error(JSON.stringify(e.stack));
            return Effect.fail(e.message);
          }),
        ),
        Effect.either,
        Effect.runPromise,
      );
    },
    ({ data, name }) => {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    },
  );
  return (
    <div className="flex gap-2 flex-col p-2 bg-sky-50">
      <div className="flex gap-2 items-center justify-between ">
        <h3 className="italic text-normal font-bold">Riwayat</h3>
      </div>
      <form onSubmit={handleSubmit} className="text-2xl flex justify-between items-end">
        <input type="hidden" name="action" value="record"></input>
        <div className="flex gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span>Dari:</span>
            <Input
              type="date"
              name="start"
              defaultValue={formatDate(startOfMonth)}
              aria-autocomplete="list"
            />
          </label>
          <div className="h-12">&mdash;</div>
          <label className="flex flex-col gap-1">
            <span>Sampai:</span>
            <Input
              type="date"
              name="end"
              defaultValue={formatDate(endOfMonth)}
              aria-autocomplete="list"
            />
          </label>
        </div>
        <Button>
          Unduh <Spinner when={loading} />
        </Button>
      </form>
      <TextError>{error}</TextError>
    </div>
  );
}

export function useDateInterval() {
  const today = Temporal.Now.zonedDateTimeISO();
  const startOfMonth = Temporal.ZonedDateTime.from({
    timeZone: today.timeZoneId,
    year: today.year,
    month: today.month,
    day: 1,
  }).startOfDay();
  const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
  return {
    startOfMonth: startOfMonth.epochMilliseconds,
    endOfMonth: endOfMonth.epochMilliseconds,
  };
}
