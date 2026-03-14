import { Extra, extrasStore } from "../../store/extra";
import { memo, useState } from "react";
import { Show } from "~/components/Show";
import { Delete } from "./z-Delete";
import { Loading } from "~/components/Loading";
import { tx } from "~/transaction";
import { useFix } from "../../use-transaction";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { queue } from "../../util-queue";

export const Item = memo(
  function Item({ extra }: { extra: Extra }) {
    const { id, saved, name, kind, value } = extra;
    const fix = useFix();
    const [input, setInput] = useState(value === 0 ? "" : value.toString());

    const updateKind = (val: "percent" | "number") => {
      if (val === "percent") {
        if (value > 100) {
          extrasStore.trigger.update({
            id,
            recipe: (draft) => {
              draft.value = 100;
            },
          });
          queue.add(tx.extra.update.value(id, 100));
          setInput("100");
        } else if (value < -100) {
          extrasStore.trigger.update({
            id,
            recipe: (draft) => {
              draft.value = -100;
            },
          });
          queue.add(tx.extra.update.value(id, -100));
          setInput("-100");
        }
      }
      extrasStore.trigger.update({
        id,
        recipe: (draft) => {
          draft.kind = val;
        },
      });
      queue.add(tx.extra.update.kind(id, val));
    };

    return (
      <div className="w-full max-w-full overflow-hidden shrink-0">
        <div className="flex gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30 group w-full max-w-full overflow-hidden min-w-0">
          <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-start justify-between gap-4 w-full min-w-0 overflow-hidden">
              <div className="flex-1 min-w-0">
                <Input
                  className="text-normalbg-transparent shadow-none focus-visible:ring-0 truncate"
                  value={name}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    extrasStore.trigger.update({
                      id,
                      recipe: (draft) => {
                        draft.name = val;
                      },
                    });
                    queue.add(tx.extra.update.name(id, val));
                  }}
                  placeholder="Nama biaya tambahan..."
                />
              </div>
            </div>

            <div className="grid grid-cols-[60px_140px_150px_110px_50px] gap-4 justify-end items-end w-full min-w-0">
              <div className="shrink-0 p-1">
                <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
                  Simpan?
                </div>
                <div className="h-9 flex items-center justify-center">
                  <Checkbox
                    checked={saved}
                    onCheckedChange={(checked) => {
                      const isChecked = !!checked;
                      extrasStore.trigger.update({
                        id,
                        recipe: (draft) => {
                          draft.saved = isChecked;
                        },
                      });
                      queue.add(tx.extra.update.saved(id, isChecked));
                    }}
                  />
                </div>
              </div>
              <div className="shrink-0 p-1">
                <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
                  Tipe
                </div>
                <Select value={kind} onValueChange={(v) => updateKind(v as "percent" | "number")}>
                  <SelectTrigger className="h-9 w-full bg-muted/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Angka</SelectItem>
                    <SelectItem value="percent">Persen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 overflow-hidden p-1">
                <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide truncate">
                  Nilai {kind === "percent" ? "(%)" : "(Rp)"}
                </div>
                <Input
                  type="number"
                  className="h-9 font-medium text-normal"
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
                    queue.add(tx.extra.update.value(id, num));
                  }}
                />
              </div>
              <div className="flex-none text-right shrink-0 p-1">
                <div className="text-tiny text-muted-foreground font-bold uppercase tracking-wider mb-1">
                  Efektif
                </div>
                <div className="text-big font-bold text-primary tabular-nums">
                  <Show value={extra.eff} fallback={<Loading />}>
                    {(effVal) => (
                      <span>Rp{Number(effVal.toFixed(fix)).toLocaleString("id-ID")}</span>
                    )}
                  </Show>
                </div>
              </div>

              <div className="w-[110px] flex items-end gap-2 shrink-0 p-1">
                <div className="flex-none">
                  <Delete id={id} />
                </div>
              </div>
            </div>
          </div>
        </div>
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
