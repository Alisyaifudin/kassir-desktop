import { Button } from "~/components/ui/button";
import { Temporal } from "temporal-polyfill";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useMemo, useState } from "react";
import { DateRangePicker } from "~/components/CalendarPicker/DateRangePicker";
import { tz } from "~/lib/constants";

type Props = {
  onDownload: (start: number, end: number) => Promise<string | null>;
};

function getDefaultInterval() {
  const today = Temporal.Now.plainDateISO();
  const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
  return [lastMonth, today] as [Temporal.PlainDate, Temporal.PlainDate];
}

export function RecordDownload({ onDownload }: Props) {
  const defaultInterval = useMemo(() => getDefaultInterval(), []);
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
    const errMsg = await onDownload(start, end);
    setLoading(false);
    setError(errMsg);
  }

  return (
    <div className="flex gap-2 flex-col p-2">
      <div className="flex gap-2 items-center justify-between">
        <h3 className="italic text-normal font-bold">Riwayat</h3>
      </div>
      <form onSubmit={handleSubmit} className="text-2xl flex justify-between items-end">
        <input type="hidden" name="action" value="record" />
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
}
