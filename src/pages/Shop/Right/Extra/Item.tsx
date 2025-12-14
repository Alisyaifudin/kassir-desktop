import { Extra, extrasStore } from "./use-extras";
import { useStoreValue } from "@simplestack/store/react";
import { memo, useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { basicStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { Show } from "~/components/Show";
import { Delete } from "./Delete";
import { Loading } from "~/components/Loading";
import { useSubtotal } from "../use-subtotal";
import Decimal from "decimal.js";
import { tx } from "~/transaction";
import { useSize } from "~/hooks/use-size";
import { produce, WritableDraft } from "immer";

function updateExtra(id: string, recipe: (draft: WritableDraft<Extra>) => void) {
  extrasStore.set(
    produce<Extra[]>((draft) => {
      const index = draft.findIndex((d) => d.id === id);
      if (index === -1) return;
      recipe(draft[index]);
    }),
  );
}

function useEffVal(id: string, value: number, kind: DB.ValueKind, prevTotal?: Decimal) {
  const [effVal, setEffVal] = useState<number | undefined>(undefined);
  const fix = useStoreValue(basicStore.select("fix"));
  useEffect(() => {
    const effVal =
      kind === "number"
        ? value
        : prevTotal === undefined
          ? undefined
          : new Decimal(prevTotal).times(value).div(100).toNumber();
    setEffVal(effVal);
    if (prevTotal === undefined || effVal === undefined) return;
    const subtotal = prevTotal.plus(effVal);
    updateExtra(id, (draft) => {
      draft.subtotal = subtotal;
    });
  }, [prevTotal, effVal, value]);
  return effVal === undefined ? undefined : Number(effVal.toFixed(fix));
}

export const ItemFirst = memo(({ extra }: { extra: Extra }) => {
  const prevTotal = useSubtotal();
  const effVal = useEffVal(extra.id, extra.value, extra.kind, prevTotal);
  return <Item effVal={effVal} extra={extra} />;
});

export const ItemRest = memo(({ extra, prevTotal }: { extra: Extra; prevTotal: Decimal }) => {
  const effVal = useEffVal(extra.id, extra.value, extra.kind, prevTotal);
  return <Item effVal={effVal} extra={extra} />;
});
export const Item = memo(
  ({ extra, effVal }: { extra: Extra; effVal?: number }) => {
    const { id, saved, name, kind, value } = extra;
    const size = useSize();
    const [input, setInput] = useState(value === 0 ? "" : value.toString());
    const handleKind = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.currentTarget.value;
      if (val !== "percent" && val !== "number") return;
      if (val === "percent") {
        if (value > 100) {
          updateExtra(id, (draft) => {
            draft.value = 100;
          });
          queue.add(() => tx.extra.update.value(id, 100));
        } else if (value < -100) {
          updateExtra(id, (draft) => {
            draft.value = -100;
          });
          queue.add(() => tx.extra.update.value(id, -100));
        }
      }
      updateExtra(id, (draft) => {
        draft.kind = val;
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
            updateExtra(id, (draft) => {
              draft.saved = saved;
            });
            queue.add(() => tx.extra.update.saved(id, saved));
          }}
        />
        <input
          type="text"
          className="pl-1 text-normal"
          value={name}
          onChange={(e) => {
            const name = e.currentTarget.value;
            updateExtra(id, (draft) => {
              draft.name = name;
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
            updateExtra(id, (draft) => {
              draft.value = num;
            });
            queue.add(() => tx.extra.update.value(id, num));
          }}
        />
        <Show when={kind === "percent"}>
          <select value={kind} className="w-fit border" onChange={handleKind}>
            <option value="number">Angka</option>
            <option value="percent">Persen</option>
          </select>
          <Show value={effVal} fallback={<Loading />}>
            {(effVal) => <p className="text-end">Rp{Number(effVal).toLocaleString("id-ID")}</p>}
          </Show>
        </Show>
        <Delete id={id} />
      </div>
    );
  },
  (prev, next) => {
    if (
      prev.effVal !== next.effVal ||
      prev.extra.kind !== next.extra.kind ||
      prev.extra.name !== next.extra.name ||
      prev.extra.saved !== next.extra.saved ||
      prev.extra.value !== next.extra.value
    )
      return false;
    return true;
  },
);
