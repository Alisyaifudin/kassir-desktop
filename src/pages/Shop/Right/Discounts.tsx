import { ForEach } from "~/components/ForEach";
import { Item } from "../utils/schema";
import { Size } from "~/lib/store-old";
import { cn } from "~/lib/utils";
import { css } from "../style.css";

export function Discounts({ discs, size }: { discs: Item["discounts"]; size: Size }) {
  return (
    <ForEach items={discs}>
      {(disc) => {
        let val = disc.value;
        return (
          <div className={cn("grid gap-1", css.discount[size])}>
            <div />
            <p>Diskon</p>
            <p className="text-end">
              {disc.kind === "percent" ? `${val}%` : val.toLocaleString("id-ID")}
            </p>
            <div />
          </div>
        );
      }}
    </ForEach>
  );
}
