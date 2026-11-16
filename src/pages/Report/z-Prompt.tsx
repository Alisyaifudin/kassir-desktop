import { useMutation } from "~/components/Loader";
import { Button } from "~/components/ui/button";
import { formatDate } from "~/lib/date";
import { rangeOf } from "~/services/report/period";
import type { ReportDay } from "~/services/report";
import { startDay } from "./data";

/**
 * What the right pane says before there is a report.
 *
 * Three sentences, deliberately distinct:
 *
 *  - **no transactions** — nothing happened that day, so there is nothing to
 *    classify and no button. Offering "Buat laporan" for an empty day would make
 *    an empty report, which reads as a zero-amount report.
 *  - **no report yet** — the day has records and nobody has started. This is the
 *    only place "Buat laporan" lives: it is useful once per day and then never
 *    again, so a permanent header button would be clutter for 364 days a year.
 *  - **nothing selected** — the report exists; pick a record. `/records` shows
 *    nothing here, because a record list is browsing. This pane is a task queue,
 *    so the silence needs a sign.
 */
export function Prompt({ day, time }: { day: ReportDay; time: number }) {
  if (day.records.length === 0) {
    return (
      <Empty title="Tidak ada transaksi" body="Tidak ada transaksi pada hari ini." />
    );
  }

  if (!day.started) {
    return <Start time={time} days={day.records.length} />;
  }

  return <Empty title="Belum ada yang dipilih" body="Pilih rekaman di sebelah kiri." />;
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/**
 * "Buat laporan", and the wait while it writes.
 *
 * One transaction seeds every line's default category (`services/report`,
 * `startDay`), so the day renders a report immediately after this — the button is
 * a seed, not a generation. A failure stays on screen with its sentence rather
 * than closing the prompt, because the prompt is the only thing to do here.
 */
function Start({ time, days }: { time: number; days: number }) {
  // The day's real boundaries come from `period.ts`, not from `time + 86_400_000`:
  // a fixed 24 hours is the one arithmetic error that moves a takings figure to
  // the neighbouring date.
  const { start, end } = rangeOf("day", time);
  const { pending, error, mutate } = useMutation(() => startDay(start, end));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">Belum ada laporan</p>
        <p className="text-sm text-muted-foreground">
          Belum ada laporan untuk {formatDate(time, "long")}.
        </p>
        <p className="text-sm text-muted-foreground">
          {days} rekaman menunggu diklasifikasi.
        </p>
      </div>

      <Button onClick={() => void mutate(undefined)} disabled={pending}>
        {pending ? "Menyiapkan…" : "Buat laporan"}
      </Button>

      {error === null ? null : <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
