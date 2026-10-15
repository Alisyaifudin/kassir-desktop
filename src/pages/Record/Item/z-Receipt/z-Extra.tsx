import { Show } from "~/components/Show";
import type { RecordExtra } from "~/services/record";

export function Extra({ extra }: { extra: RecordExtra }) {
  return (
    <div className="grid grid-cols-[100px_120px]">
      <p>
        {extra.name} <Show when={extra.kind === "percent"}>{extra.value}%</Show>
      </p>
      <p className="text-end">Rp{extra.eff.toLocaleString("id-ID")}</p>
    </div>
  );
}
