import { basicStore, useFix, useMode } from "../../use-transaction";
import { useSize } from "~/hooks/use-size";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { Kbd } from "~/components/ui/kdb";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { usePay } from "./use-pay";

export function Form() {
  const size = useSize();
  const mode = useMode();
  const fix = useFix();
  const { form, setForm, change, disable } = usePay();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="flex-1 flex flex-col gap-1 h-fit"
    >
      <label className={cn("grid items-center", css.grid[size])}>
        <span>
          Bayar <Kbd>F2</Kbd>
        </span>
        :
        <Input
          type="number"
          id="pay-input"
          step={Math.pow(10, -1 * fix)}
          value={form.pay}
          onChange={(e) => {
            const val = e.currentTarget.value;
            const num = Number(val);
            if (isNaN(num) || num < 0) return;
            setForm((form) => ({ ...form, pay: val }));
          }}
          aria-autocomplete="list"
        />
      </label>
      <label className={cn("grid items-center", css.grid[size])}>
        <span>Pembulatan</span>
        :
        <Input
          type="number"
          step={Math.pow(10, -1 * fix)}
          value={form.rounding}
          onChange={(e) => {
            const val = e.currentTarget.value;
            const num = Number(val);
            if (isNaN(num)) return;
            setForm((form) => ({ ...form, rounding: val }));
            basicStore.set((prev) => ({ ...prev, rounding: num }));
          }}
          aria-autocomplete="list"
        />
      </label>
      <div className={cn("grid items-center", css.grid[size])}>
        <p>Kembalian</p>:
        <p
          className={cn(css.change[size], {
            "bg-red-500 text-white px-1": change < 0,
          })}
        >
          {change === 0 ? "0" : change.toLocaleString("id-ID")}
        </p>
      </div>
      <div className="flex items-center gap-1 w-full">
        <Button className="flex-1" type="submit" disabled={disable || change < 0}>
          Bayar
        </Button>
        <Show when={mode === "buy"}>
          <Button
            disabled={disable}
            className="flex-1"
            onClick={(e) => {
              e.preventDefault();
            }}
            type="button"
          >
            Kredit
          </Button>
        </Show>
      </div>
    </form>
  );
}
