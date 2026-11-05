import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { InputCurrency } from "~/components/ui/input-currency";
import { InputPercent } from "~/components/ui/input-percent";
import type { MarginEstimate } from "~/services/analytics";
import { money } from "../z-Chart";

/**
 * The two numbers behind every estimated bar.
 *
 * A line whose cost cannot be believed is given `min(total × percent, raw)`, so
 * the fields are the shop's margin rule and the most a single line may be
 * credited with. Both are per line — the cap is not a daily ceiling, and the
 * percent is not an average the page distributes.
 *
 * Nothing is saved by hand: a field settles, it is written, and the chart it
 * changes is right above. The control says so rather than pretending there is a
 * Simpan button.
 */
export function EstimateFields({
  estimate,
  pending,
  error,
  change,
}: {
  estimate: MarginEstimate;
  pending: boolean;
  error: { message: string } | null | undefined;
  change: (patch: Partial<MarginEstimate>) => void;
}) {
  // The line total at which the cap starts to bite: below it the percent is the
  // smaller of the two and decides the estimate on its own.
  const crossing = estimate.percent > 0 ? estimate.raw / (estimate.percent / 100) : null;

  return (
    <section
      aria-label="Penaksiran laba"
      className="flex flex-col gap-2 rounded-xl border bg-muted/30 px-3 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold">Penaksiran laba</p>
            <Spinner when={pending} />
          </div>
          <p className="text-sm text-muted-foreground">
            Untuk baris yang modalnya tidak tercatat, atau tidak lebih rendah dari harga jualnya
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Persentase</span>
            <span className="flex h-9 w-24 items-center rounded-md border border-input bg-card px-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
              <InputPercent
                aria-label="Persentase taksiran laba"
                min={0}
                max={100}
                value={estimate.percent}
                onValueChange={(percent) => change({ percent })}
              />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Batas per baris</span>
            <span className="flex h-9 w-36 items-center rounded-md border border-input bg-card px-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
              <InputCurrency
                aria-label="Batas taksiran laba per baris"
                placeholder="0"
                value={estimate.raw}
                onValueChange={(raw) => change({ raw })}
              />
            </span>
          </label>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Tiap baris ditaksir {estimate.percent}% dari totalnya, paling banyak {money(estimate.raw)}.
        {crossing === null
          ? " Tanpa persentase, taksiran hanya sebatas itu."
          : ` Batas berlaku untuk baris di atas ${money(crossing)}.`}
      </p>
      <TextError>{error?.message ?? null}</TextError>
    </section>
  );
}
