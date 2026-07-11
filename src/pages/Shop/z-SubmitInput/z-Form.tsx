import { createFormHook, createFormHookContexts, useStore } from "@tanstack/react-form";
import Decimal from "decimal.js";
import { useMemo, useState } from "react";
import { Pay } from "./z-Pay";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { Method } from "~/services/transaction/type";
import { cn } from "~/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

// ── setup ──────────────────────────────────────────────

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
});

// ── types ──────────────────────────────────────────────

let nextPayId = 0;

type PayEntry = { id: number; method: Method; value: number };
type FormValues = { pays: PayEntry[]; rounding: number };

type Props = {
  methods: Method[];
  total: number;
  fix: number;
  mode: "buy" | "sell";
  loading: boolean;
  onSubmit: (isCredit: boolean) => void;
};

const defaultMethod: Method = { id: "1000", kind: "cash" };

const formDefaults: FormValues = {
  pays: [{ id: 0, method: defaultMethod, value: 0 }],
  rounding: 0,
};

// ── PayInput ───────────────────────────────────────────

const PayInput = withForm({
  defaultValues: formDefaults,
  props: { methods: [] as Method[], onOpenDialog: () => {} },
  render: function Render({ form, methods, onOpenDialog }) {
    const pays = useStore(form.store, (s) => (s.values as FormValues).pays);
    const isMulti = pays.length > 1;
    const totalPay = pays
      .reduce((s, p) => s.plus(p.value), new Decimal(0))
      .toNumber()
      .toLocaleString("id-ID");

    return (
      <>
        <Show when={isMulti}>
          <div className="grid grid-cols-[160px_10px_1fr] small:grid-cols-[120px_10px_1fr] items-center">
            <span>Total Bayar</span>
            <span>:</span>
            <span className="font-medium">{totalPay}</span>
          </div>
        </Show>
        <Show when={!isMulti}>
          <form.AppField name="pays[0].method">
            {(mf) => (
              <form.AppField name="pays[0].value">
                {(vf) => (
                  <Pay
                    methods={methods}
                    method={mf.state.value}
                    value={vf.state.value}
                    withShortcut
                    onMethodChange={(m) => mf.handleChange(m)}
                    onValueChange={(v) => vf.handleChange(v)}
                  />
                )}
              </form.AppField>
            )}
          </form.AppField>
        </Show>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onOpenDialog}>
          <Plus className="size-4" />{" "}
          {isMulti ? `${pays.length} Metode Bayar` : "Tambah Metode Bayar"}
        </Button>
      </>
    );
  },
});

// ── RoundingInput ──────────────────────────────────────

const RoundingInput = withForm({
  defaultValues: formDefaults,
  render: function Render({ form }) {
    return (
      <form.AppField name="rounding">
        {(f) => (
          <label className="grid grid-cols-[160px_10px_1fr] small:grid-cols-[120px_10px_1fr] items-center">
            <span>Pembulatan</span>
            <span>:</span>
            <Input
              type="number"
              step="any"
              value={f.state.value === 0 ? "" : f.state.value}
              onChange={(e) => {
                const n = Number(e.currentTarget.value);
                if (!isNaN(n) && isFinite(n)) f.handleChange(n);
              }}
            />
          </label>
        )}
      </form.AppField>
    );
  },
});

// ── ChangeAndSubmit ────────────────────────────────────

const ChangeAndSubmit = withForm({
  defaultValues: formDefaults,
  props: {
    total: 0,
    fix: 0,
    mode: "" as "buy" | "sell",
    loading: false,
    onSubmit: (_: boolean) => {},
  },
  render: function Render({ form, total, fix, mode, loading, onSubmit }) {
    const td = useMemo(() => new Decimal(total), [total]);
    const v = form.state.values as FormValues;
    const tp = useMemo(() => v.pays.reduce((s, p) => s.plus(p.value), new Decimal(0)), [v.pays]);
    const change = useMemo(() => tp.minus(td).minus(v.rounding), [tp, td, v.rounding]);
    const cn_ = Number(change.toFixed(fix));
    const dis = loading || cn_ < 0;

    return (
      <>
        <div className="grid grid-cols-[160px_10px_1fr] small:grid-cols-[120px_10px_1fr] items-center">
          <span>Kembalian</span>
          <span>:</span>
          <span className={cn("text-change px-1", cn_ < 0 && "bg-red-500 text-white")}>
            {cn_ === 0 ? "0" : cn_.toLocaleString("id-ID")}
          </span>
        </div>
        <div className="flex items-center gap-1 w-full">
          <Button className="flex-1" type="submit" disabled={dis}>
            Bayar
          </Button>
          <Show when={mode === "buy"}>
            <Button
              disabled={dis || loading}
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                if (!loading) onSubmit(true);
              }}
              type="button"
            >
              Kredit
            </Button>
          </Show>
        </div>
      </>
    );
  },
});

// ── SplitPayDialog ─────────────────────────────────────

const SplitPayDialog = withForm({
  defaultValues: formDefaults,
  props: {
    methods: [] as Method[],
    firstMethod: defaultMethod,
    open: false,
    onOpenChange: (_: boolean) => {},
  },
  render: function Render({ form, methods, firstMethod, open, onOpenChange }) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            <form.AppField name="pays" mode="array">
              {(pf) => {
                const entries = pf.state.value as PayEntry[];
                const multi = entries.length > 1;
                return (
                  <>
                    {entries.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-1">
                        <form.AppField name={`pays[${i}].method`}>
                          {(mf) => (
                            <form.AppField name={`pays[${i}].value`}>
                              {(vf) => (
                                <Pay
                                  methods={methods}
                                  method={mf.state.value}
                                  value={vf.state.value}
                                  onMethodChange={(m) => mf.handleChange(m)}
                                  onValueChange={(v) => vf.handleChange(v)}
                                />
                              )}
                            </form.AppField>
                          )}
                        </form.AppField>
                        <Show when={multi}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => pf.removeValue(i)}
                            aria-label="Hapus metode pembayaran"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </Show>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() =>
                        pf.pushValue({ id: nextPayId++, method: firstMethod, value: 0 })
                      }
                    >
                      <Plus className="size-4" /> Tambah
                    </Button>
                    <Show when={multi}>
                      <div className="flex items-center justify-between border-t pt-2 mt-1">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="font-medium">
                          {entries
                            .reduce((s, p) => s.plus(p.value), new Decimal(0))
                            .toNumber()
                            .toLocaleString("id-ID")}
                        </span>
                      </div>
                    </Show>
                  </>
                );
              }}
            </form.AppField>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
});

// ── Form ───────────────────────────────────────────────

export function Form({ methods, total, fix, mode, loading, onSubmit }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const firstMethod = methods[0] ?? defaultMethod;

  const form = useAppForm({
    defaultValues: {
      pays: [{ id: nextPayId++, method: firstMethod, value: 0 }] as PayEntry[],
      rounding: 0,
    } as FormValues,
    onSubmit: async () => {
      onSubmit(false);
    },
  });

  const fv = form.state.values as FormValues;
  const disable = useMemo(() => {
    const tp = fv.pays.reduce((s, e) => s.plus(e.value), new Decimal(0));
    return loading || Number(tp.minus(total).minus(fv.rounding).toFixed(fix)) < 0;
  }, [fv, total, fix, loading]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disable) return;
        form.handleSubmit();
      }}
      className="flex-1 flex flex-col gap-2 h-fit"
    >
      <form.AppForm>
        <PayInput form={form} methods={methods} onOpenDialog={() => setDialogOpen(true)} />
        <RoundingInput form={form} />
        <SplitPayDialog
          form={form}
          methods={methods}
          firstMethod={firstMethod}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </form.AppForm>
      <ChangeAndSubmit
        form={form}
        total={total}
        fix={fix}
        mode={mode}
        loading={loading}
        onSubmit={onSubmit}
      />
    </form>
  );
}
