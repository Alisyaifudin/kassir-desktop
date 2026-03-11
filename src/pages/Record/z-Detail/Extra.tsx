import { Show } from "~/components/Show";
import type { RecordExtra } from "~/database-effect/record-extra/get-by-range";

export function Extra({ extra }: { extra: RecordExtra }) {
  return (
    <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
      <p className="text-end">
        {extra.name} <Show when={extra.kind === "percent"}>{extra.value}%</Show>
      </p>{" "}
      <p className="text-end">Rp{extra.eff.toLocaleString("id-ID")}</p>
    </div>
  );
}
