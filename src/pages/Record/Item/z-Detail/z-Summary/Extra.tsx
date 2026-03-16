import { Show } from "~/components/Show";
import { RecordData } from "../../use-data";

export function Extra({ extra }: { extra: RecordData["extras"][number] }) {
  return (
    <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
      <p className="text-end">
        {extra.name} <Show when={extra.kind === "percent"}>{extra.value}%</Show>
      </p>
      <p className="text-end">Rp{extra.eff.toLocaleString("id-ID")}</p>
    </div>
  );
}
