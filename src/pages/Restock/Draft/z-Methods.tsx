import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft, DraftMethod } from "~/services/transaction";
import { run } from "../run";

/**
 * The payments on the draft. A record has as many as the operator needs, so
 * each row is its own method and amount and the list is rewritten as a whole —
 * `tx_methods` stores one row per payment.
 */
export function Methods({
  draft,
  catalog,
}: {
  draft: Draft;
  catalog: MethodCatalog;
}) {
  const set = (methods: DraftMethod[]) =>
    run(service.transaction.methods.set(draft.id, methods));

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
          <Input
            type="number"
            step="any"
            className="flex-1 text-right"
            placeholder="0"
            value={method.value === 0 ? "" : method.value}
            onChange={(event) => update(method.id, { value: Number(event.currentTarget.value) || 0 })}
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
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select
        value={kind}
        onValueChange={(value) => onChange(defaultMethodId(catalog, value as MethodKind))}
      >
        <SelectTrigger className="w-[150px]">
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
        <Select value={methodId} onValueChange={onChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="--Pilih--" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
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
