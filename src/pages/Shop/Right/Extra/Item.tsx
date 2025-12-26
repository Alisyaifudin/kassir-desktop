import { Extra, extrasStore } from "./use-extras";
import { memo, useState } from "react";
import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { queue } from "~/pages/Shop/utils/queue";
import { Show } from "~/components/Show";
import { Delete } from "./Delete";
import { Loading } from "~/components/Loading";
import { tx } from "~/transaction";
import { useSize } from "~/hooks/use-size";
import { useFix } from "../../use-transaction";

export const Item = memo(
  ({ extra }: { extra: Extra }) => {
    const { id, saved, name, kind, value } = extra;
    const fix = useFix()
    const size = useSize();
    const [input, setInput] = useState(value === 0 ? "" : value.toString());
    const handleKind = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.currentTarget.value;
      if (val !== "percent" && val !== "number") return;
      if (val === "percent") {
        if (value > 100) {
          extrasStore.trigger.update({
            id,
            recipe: (draft) => {
              draft.value = 100;
            },
          });
          queue.add(() => tx.extra.update.value(id, 100));
        } else if (value < -100) {
          extrasStore.trigger.update({
            id,
            recipe: (draft) => {
              draft.value = 100;
            },
          });
          queue.add(() => tx.extra.update.value(id, -100));
        }
      }
      extrasStore.trigger.update({
        id,
        recipe: (draft) => {
          draft.kind = val;
        },
      });
      queue.add(() => tx.extra.update.kind(id, val));
    };
    return (
      <div className={cn("grid gap-1 py-0.5 self-end items-center", css.additional[size][kind])}>
        <input
          type="checkbox"
          name="saved"
          checked={saved}
          onChange={(e) => {
            const saved = e.currentTarget.checked;
            extrasStore.trigger.update({
              id,
              recipe: (draft) => {
                draft.saved = saved;
              },
            });
            queue.add(() => tx.extra.update.saved(id, saved));
          }}
        />
        <input
          type="text"
          className="pl-1 text-normal py-1 border"
          value={name}
          onChange={(e) => {
            const name = e.currentTarget.value;
            extrasStore.trigger.update({
              id,
              recipe: (draft) => {
                draft.name = name;
              },
            });
            queue.add(() => tx.extra.update.name(id, name));
          }}
        />
        <Show when={kind === "number"}>
          <select value={kind} className="w-fit" onChange={handleKind}>
            <option value="number">Angka</option>
            <option value="percent">Persen</option>
          </select>
        </Show>
        <Show when={kind === "number"}>
          <p>Rp</p>
        </Show>
        <input
          type="number"
          className="border py-1 pl-1 text-normal"
          value={input}
          onChange={(e) => {
            let val = e.currentTarget.value;
            let num = Number(val);
            if (isNaN(num)) return;
            if (kind === "percent") {
              if (num > 100) {
                num = 100;
                val = num.toString();
              } else if (num < -100) {
                num = -100;
                val = num.toString();
              }
            }
            setInput(val);
            extrasStore.trigger.update({
              id,
              recipe: (draft) => {
                draft.value = num;
              },
            });
            queue.add(() => tx.extra.update.value(id, num));
          }}
        />
        <Show when={kind === "percent"}>
          <select value={kind} className="w-fit border" onChange={handleKind}>
            <option value="number">Angka</option>
            <option value="percent">Persen</option>
          </select>
          <Show value={extra.eff} fallback={<Loading />}>
            {(effVal) => <p className="text-end">Rp{Number(effVal.toFixed(fix)).toLocaleString("id-ID")}</p>}
          </Show>
        </Show>
        <Delete id={id} />
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.extra.eff === next.extra.eff &&
      prev.extra.kind === next.extra.kind &&
      prev.extra.name === next.extra.name &&
      prev.extra.saved === next.extra.saved &&
      prev.extra.value === next.extra.value
    );
  },
);
