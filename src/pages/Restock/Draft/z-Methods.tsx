import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { InputCurrency } from "~/components/ui/input-currency";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  METHOD_BASE_ID,
  METHODS,
  METHOD_NAMES,
  type DefaultableKind,
  type MethodKind,
} from "~/lib/constants";
import { generateId } from "~/lib/random";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft, DraftMethod } from "~/services/transaction";
import { run } from "../run";

/** The default `Input` chrome, so a currency field sits in the row like one. */
const AMOUNT_CLASS =
  "flex w-full text-normal rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/** The first amount field, so F2 (see Draft) can land on it. */
const PAYMENT_AMOUNT_ID = "payment-amount-0";

/**
 * The payments on the draft. A record has as many as the operator needs, so
 * each row is its own method and amount and the list is rewritten as a whole —
 * `tx_methods` stores one row per payment.
 */
export function Methods({
  draft,
  catalog,
  focusPayment,
}: {
  draft: Draft;
  catalog: MethodCatalog;
  focusPayment: number;
}) {
  const set = (methods: DraftMethod[]) =>
    run(service.transaction.methods.set(draft.id, methods));

  // F2 asked the payment stage to take the focus; put it on the first amount
  // once this stage is actually on screen.
  useEffect(() => {
    if (focusPayment === 0) return;
    document.getElementById(PAYMENT_AMOUNT_ID)?.focus();
  }, [focusPayment]);

  function add() {
    set([
      ...draft.methods,
      { id: generateId(), methodId: defaultMethodId(catalog, "cash"), value: 0 },
    ]);
  }

  function update(id: string, patch: Partial<DraftMethod>) {
    set(draft.methods.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  }

  return (
    <div className="flex flex-col gap-2">
      {draft.methods.map((method, index) => (
        <div key={method.id} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-small text-muted-foreground tabular-nums select-none">
            {index + 1}.
          </span>
          <MethodPicker
            methodId={method.methodId}
            catalog={catalog}
            onChange={(methodId) => update(method.id, { methodId })}
          />
          <InputCurrency
            id={index === 0 ? PAYMENT_AMOUNT_ID : undefined}
            className={cn(AMOUNT_CLASS, "flex-1 text-right")}
            placeholder="0"
            value={method.value}
            onValueChange={(value) => update(method.id, { value })}
          />
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full"
            title="Hapus pembayaran"
            disabled={draft.methods.length <= 1}
            onClick={() => set(draft.methods.filter((row) => row.id !== method.id))}
          >
            <X className="icon" />
          </Button>
        </div>
      ))}
      <Button variant="outline" className="self-start" onClick={add}>
        <Plus className="icon" />
        Tambah metode
      </Button>
    </div>
  );
}

/** The kind, then the account inside it — a transfer target or a debit card. */
function MethodPicker({
  methodId,
  catalog,
  onChange,
}: {
  methodId: string;
  catalog: MethodCatalog;
  onChange: (methodId: string) => void;
}) {
  const method = catalog.methods.find((candidate) => candidate.id === methodId);
  const kind: MethodKind = method?.kind ?? "cash";
  const accounts = catalog.methods.filter(
    (candidate) => candidate.kind === kind && candidate.name !== null,
  );
  // "--Pilih--" is the kind's base method — no account chosen. The base id is
  // not an account, so it doubles as the empty choice (Radix forbids an empty
  // SelectItem value).
  const accountId = accounts.some((account) => account.id === methodId)
    ? methodId
    : METHOD_BASE_ID[kind];
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select
        value={kind}
        onValueChange={(value) => onChange(defaultMethodId(catalog, value as MethodKind))}
      >
        <SelectTrigger className="w-[180px] small:w-[150px]">
          <SelectValue>{METHOD_NAMES[kind]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {METHODS.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {METHOD_NAMES[candidate]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {accounts.length > 0 ? (
        <Select value={accountId} onValueChange={onChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="--Pilih--" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={METHOD_BASE_ID[kind]}>--Pilih--</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

/** The kind's default account when it has one, else the built-in base method. */
function defaultMethodId(catalog: MethodCatalog, kind: MethodKind): string {
  if (kind !== "cash") {
    const fallback = catalog.defaults[kind as DefaultableKind];
    if (fallback !== undefined) return fallback;
  }
  return METHOD_BASE_ID[kind];
}
