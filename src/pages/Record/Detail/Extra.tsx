import { Show } from "~/components/Show";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { useSize } from "~/hooks/use-size";
import { cn } from "~/lib/utils";
import { css } from "../style.css";

export function Extra({ extra }: { extra: RecordExtra }) {
  const size = useSize();
  return (
    <div className={cn("grid", css.footer[size])}>
      <p className="text-end">
        {extra.name} <Show when={extra.kind === "percent"}>{extra.value}%</Show>
      </p>{" "}
      <p className="text-end">Rp{extra.eff.toLocaleString("id-ID")}</p>
    </div>
  );
}
