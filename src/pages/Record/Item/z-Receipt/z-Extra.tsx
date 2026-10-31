import { Show } from "~/components/Show";
import type { RecordExtra } from "~/services/record";
import { rupiah } from "~/pages/Record/z-Detail/extras";

/**
 * One extra on the printed face: its label, and what it worked out to with the
 * sign in front — `-Rp5.000`, not `Rp-5.000`. That is what the renderer puts on
 * paper (`receipt::text::extras_text_data`), so it is what the preview has to
 * show; a screen that disagrees with the paper about a row is worse than no
 * preview. The amount is rounded to the record's own `fix` for the same reason,
 * and a zero extra prints a minus here too — on paper it is a deduction slot,
 * not a charge.
 */
export function Extra({ extra, fix }: { extra: RecordExtra; fix: number }) {
  const sign = extra.eff > 0 ? "" : "-";
  return (
    <div className="grid grid-cols-[100px_120px]">
      <p>
        {extra.name} <Show when={extra.kind === "percent"}>{extra.value}%</Show>
      </p>
      <p className="text-end">
        {sign}
        {rupiah(Math.abs(extra.eff), fix)}
      </p>
    </div>
  );
}
