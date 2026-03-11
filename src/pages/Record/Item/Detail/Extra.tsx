import { Show } from "~/components/Show";
import { Data } from "../loader";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";

export function Extra({ extra }: { extra: Data["extras"][number] }) {
  const size = useSize();
  return (
    <div className={cn("grid", css.footer[size])}>
      <p className="text-end">
        {extra.name} <Show when={extra.kind === "percent"}>{extra.value}%</Show>
      </p>
      <p className="text-end">Rp{extra.eff.toLocaleString("id-ID")}</p>
    </div>
  );
}
