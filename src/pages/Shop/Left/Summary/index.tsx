import { Input } from "~/components/ui/input";
import { cn, Result } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { Note } from "./Note";
import { Method } from "./Method";
import { Customer } from "./Customer";
import { css } from "../../style.css";
import { Suspense, useState } from "react";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { Loading } from "~/components/Loading";
import { Method as MethodDB } from "~/database/method/get-all";
import { useClear } from "./use-clear";
import { useSize } from "~/hooks/use-size";
import { useFix, useMode, usePay, useRounding } from "../../use-transaction";
import { useTotal } from "../../Right/use-total";
import { useStatus } from "../../use-status";
import { productsStore } from "../../Right/Product/use-products";
import { extrasStore } from "../../Right/Extra/use-extras";
import { useSubmit } from "react-router";
import { Customer as CustomerDB } from "~/database/customer/get-all";
import { useAtom } from "@xstate/store/react";
import { useLoading } from "~/hooks/use-loading";

export function Summary({
  methods,
  customers,
}: {
  methods: Promise<Result<"Aplikasi bermasalah", MethodDB[]>>;
  customers: Promise<Result<"Aplikasi bermasalah", CustomerDB[]>>;
}) {
  const submitLoading = useLoading();
  const fix = useFix();
  const pay = usePay();
  const mode = useMode();
  const rounding = useRounding();
  const productsLength = useAtom(productsStore, (state) => state.context.length);
  const extrasLength = useAtom(extrasStore, (state) => state.context.length);
  const status = useStatus();
  const loading = status === "active" || submitLoading;
  const [form, setForm] = useState({
    pay: pay === 0 ? "" : pay.toString(),
    rounding: rounding === 0 ? "" : rounding.toString(),
  });
  const total = useTotal();
  const clear = useClear();
  const size = useSize();
  const submit = useSubmit();
  function handleSubmit(isCredit: boolean) {
    const formdata = new FormData();
    formdata.set("action", "submit");
    formdata.set("pay", form.pay);
    formdata.set("rounding", form.rounding);
    formdata.set("is-credit", String(isCredit));
    submit(formdata, { method: "post" });
  }
  return (
    <div className="flex flex-col p-2 h-fit gap-2">
      <div className="flex flex-col gap-2 flex-1 h-full items-center justify-between">
        <div className="flex items-center gap-1 justify-between w-full">
          <Button
            className="p-1 rounded-full"
            type="button"
            variant="destructive"
            onClick={() => clear()}
          >
            <RefreshCcw className="icon" />
          </Button>
          <Suspense fallback={<Loading />}>
            <Method methods={methods} />
          </Suspense>
          <Suspense fallback={<Loading />}>
            <Customer customers={customers} />
          </Suspense>
          <Note />
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(false);
        }}
        className="flex-1 flex flex-col gap-1 h-fit"
      >
        <label className={cn("grid items-center", css.summary[size].grid)}>
          <span>Bayar</span>
          :
          <Input
            type="number"
            value={form.pay}
            step={Math.pow(10, -1 * fix)}
            onChange={(e) => {
              const val = e.currentTarget.value;
              const num = Number(val);
              if (isNaN(num) || num < 0) return;
              setForm((form) => ({ ...form, pay: val }));
            }}
            aria-autocomplete="list"
          />
        </label>
        <label className={cn("grid items-center", css.summary[size].grid)}>
          <span>Pembulatan</span>
          :
          <Input
            type="number"
            value={form.rounding}
            step={Math.pow(10, -1 * fix)}
            onChange={(e) => {
              const val = e.currentTarget.value;
              const num = Number(val);
              if (isNaN(num)) return;
              setForm((form) => ({ ...form, rounding: val }));
            }}
            aria-autocomplete="list"
          />
        </label>
        <Show
          value={total}
          fallback={
            <>
              <div className={cn("grid items-center", css.summary[size].grid)}>
                <p>Kembalian</p>:
                <p className={css.summary[size].change}>
                  <Loader2 className="animate-spin" />
                </p>
              </div>
              <div className="flex items-center gap-1 w-full">
                <Button className="flex-1" type="submit" disabled>
                  Bayar <Spinner when={loading} />
                </Button>
                <Show when={mode === "buy"}>
                  <Button disabled className="flex-1" type="button">
                    Kredit
                  </Button>
                </Show>
              </div>
            </>
          }
        >
          {(total) => {
            const rounding = Number(form.rounding);
            const pay = Number(form.pay);
            const change = -1 * Number(total.plus(rounding).minus(pay).toFixed(fix));
            return (
              <>
                <div className={cn("grid items-center", css.summary[size].grid)}>
                  <p>Kembalian</p>:
                  <p className={cn({ "bg-red-500 text-white px-1": change < 0 })}>
                    {change.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center gap-1 w-full">
                  <Button
                    className="flex-1"
                    type="submit"
                    disabled={change < 0 || (productsLength === 0 && extrasLength === 0)}
                  >
                    Bayar <Spinner when={loading} />
                  </Button>
                  <Show when={mode === "buy"}>
                    <Button
                      disabled={productsLength === 0 && extrasLength === 0}
                      className="flex-1"
                      onClick={() => handleSubmit(true)}
                      type="button"
                    >
                      Kredit
                    </Button>
                  </Show>
                </div>
              </>
            );
          }}
        </Show>
      </form>
    </div>
  );
}
