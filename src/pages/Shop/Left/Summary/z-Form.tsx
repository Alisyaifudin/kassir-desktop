import { setPay, setRounding, useFix, useMode, usePay, useRounding } from "../../use-transaction";
import { Kbd } from "~/components/ui/kdb";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { useChange } from "./use-change";

export function Form() {
  const mode = useMode();
  const fix = useFix();
  const pay = usePay();
  const rounding = useRounding();
  const { change, disable } = useChange(pay.num, rounding.num);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="flex-1 flex flex-col gap-1 h-fit"
    >
      <label className="grid items-center grid-cols-[160px_10px_1fr] small:grid-cols-[120px_10px_1fr]">
        <span>
          Bayar <Kbd>F2</Kbd>
        </span>
        :
        <Input
          type="number"
          id="pay-input"
          step={Math.pow(10, -1 * fix)}
          value={pay.str}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setPay(val);
          }}
          aria-autocomplete="list"
        />
      </label>
      <label className="grid items-center grid-cols-[160px_10px_1fr] small:grid-cols-[120px_10px_1fr]">
        <span>Pembulatan</span>
        :
        <Input
          type="number"
          step={Math.pow(10, -1 * fix)}
          value={rounding.str}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setRounding(val);
          }}
          aria-autocomplete="list"
        />
      </label>
      <div className="grid items-center grid-cols-[160px_10px_1fr] small:grid-cols-[120px_10px_1fr]">
        <span>Kembalian</span>:
        <span
          style={
            change < 0
              ? {
                  backgroundColor: "var(--color-red-500)",
                  color: "var(--color-white)",
                }
              : undefined
          }
          className="text-change px-1"
        >
          {change === 0 ? "0" : change.toLocaleString("id-ID")}
        </span>
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
