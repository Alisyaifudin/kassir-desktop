import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { InputCurrency } from "~/components/ui/input-currency";
import { Kbd } from "~/components/ui/kdb";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
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
  METHOD_KBD,
} from "~/lib/constants";
import { generateId } from "~/lib/random";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft, DraftMethod } from "~/services/transaction";
import { paidTotal } from "~/lib/purchase";
import { run } from "../run";
import { rupiah } from "../util-rupiah";
import { Cell, SELECTED_RING } from "./z-Cell";

/** The default `Input` chrome, so a currency field sits in the row like one. */
const AMOUNT_CLASS =
  "flex w-full text-normal rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/** The first amount field, so F2 (see page) can land on it. */
const PAYMENT_AMOUNT_ID = "payment-amount-0";

/** Ctrl+0..3 pick the method kind, in `METHODS` order. */
const METHOD_BY_KEY: Record<string, MethodKind> = {
  "0": "cash",
  "1": "qris",
  "2": "transfer",
  "3": "debit",
};

/** The cells of the settle grid, in navigation order. */
type PayField = "rounding" | "kind" | "account" | "amount" | "add" | "summary" | "pay";

/**
 * The payment grid, in the same idiom as the main panel: one cell at a time,
 * arrows to move, Enter to edit. A click is enough to select *and* edit; the
 * keyboard keeps selection and editing separate.
 *
 * A lone method stays inline — kind, account, amount — with `+` opening the
 * full editor. A second method collapses that row into a summary cell that
 * opens the same editor.
 */
export function Methods({
  draft,
  catalog,
  focusPayment,
  onExitUp,
  focused,
  onActivate,
  onFocusPay,
  focusRounding,
}: {
  draft: Draft;
  catalog: MethodCatalog;
  focusPayment: number;
  onExitUp: () => void;
  focused: boolean;
  onActivate: () => void;
  onFocusPay: () => void;
  focusRounding: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PayField>("rounding");
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasEditing = useRef(false);
  // The shortcut handler lives in an effect; keep the latest draft reachable
  // without re-registering on every keystroke.
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  // Bayar's hand-off back to Pembulatan.
  const seenFocusRounding = useRef(focusRounding);

  const set = (methods: DraftMethod[]) => run(service.transaction.methods.set(draft.id, methods));

  const first = draft.methods[0] ?? null;
  const multiple = draft.methods.length > 1;
  const firstMethod = catalog.methods.find((method) => method.id === first?.methodId);
  const kind: MethodKind = firstMethod?.kind ?? "cash";
  const accounts = catalog.methods.filter(
    (candidate) => candidate.kind === kind && candidate.name !== null,
  );
  const accountId =
    first !== null && accounts.some((account) => account.id === first.methodId)
      ? first.methodId
      : METHOD_BASE_ID[kind];
  // An account (Shopee, BCA) reads better than its kind; the kind is the fallback.
  const firstLabel = firstMethod?.name ?? METHOD_NAMES[kind];
  const total = paidTotal(draft.methods);

  const methodRow: PayField[] = useMemo(
    () =>
      multiple
        ? ["summary"]
        : first === null
          ? ["add"]
          : accounts.length > 0
            ? ["kind", "account", "amount", "add"]
            : ["kind", "amount", "add"],
    [multiple, first, accounts.length],
  );
  const rows: PayField[][] = [["rounding"], methodRow];

  // F2 asked for the first amount; in a multi-method draft that lives in the
  // editor, so open it and reach for the field there.
  useEffect(() => {
    if (focusPayment === 0) return;
    if (multiple) {
      setOpen(true);
    } else {
      setSelected("amount");
      setEditing(true);
    }
    const timer = setTimeout(() => {
      const input = document.getElementById(PAYMENT_AMOUNT_ID);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [focusPayment, multiple]);

  // Bayar pressed Left: come back to Pembulatan.
  useEffect(() => {
    if (focusRounding === seenFocusRounding.current) return;
    seenFocusRounding.current = focusRounding;
    setSelected("rounding");
    setEditing(false);
    containerRef.current?.focus();
  }, [focusRounding]);

  // With a single method, Ctrl+0..3 swap its kind (and default account).
  useEffect(() => {
    if (multiple || first === null) return;
    const firstMethodId = first.id;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const kind = METHOD_BY_KEY[event.key];
      if (kind === undefined) return;
      event.preventDefault();
      const methodId = defaultMethodId(catalog, kind);
      const current = latestDraft.current;
      run(
        service.transaction.methods.set(
          current.id,
          current.methods.map((method) =>
            method.id === firstMethodId ? { ...method, methodId } : method,
          ),
        ),
      );
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [multiple, first, catalog]);

  // Hand focus back to the grid once an editor or a select closes, so the
  // arrows keep working.
  useEffect(() => {
    if (editing) {
      wasEditing.current = true;
      return;
    }
    if (!focused) {
      wasEditing.current = false;
      return;
    }
    if (!wasEditing.current) return;
    wasEditing.current = false;
    const timer = setTimeout(() => containerRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [editing, focused]);

  // Kind changes can remove the account cell; never leave the selection on a
  // field that is no longer on screen.
  useEffect(() => {
    if (selected !== "rounding" && selected !== "pay" && !methodRow.includes(selected)) {
      setSelected("amount");
      setEditing(false);
    }
  }, [selected, methodRow]);

  function add() {
    set([
      ...draft.methods,
      { id: generateId(), methodId: defaultMethodId(catalog, "cash"), value: 0 },
    ]);
  }

  function update(id: string, patch: Partial<DraftMethod>) {
    set(draft.methods.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  }

  function moveVertical(delta: number): boolean {
    const index = rows.findIndex((row) => row.includes(selected));
    if (index === -1) return false;
    const target = rows[index + delta];
    if (target === undefined) return false;
    const column = rows[index].indexOf(selected);
    setSelected(target[Math.min(column, target.length - 1)]);
    setEditing(false);
    return true;
  }

  function moveHorizontal(delta: number) {
    if (selected === "pay") {
      if (delta < 0) {
        setSelected("rounding");
        setEditing(false);
        containerRef.current?.focus();
      }
      return;
    }
    const row = rows.find((candidate) => candidate.includes(selected));
    if (row === undefined) return;
    const index = row.indexOf(selected);
    const next = row[index + delta];
    if (next !== undefined) {
      setSelected(next);
      setEditing(false);
      return;
    }
    // The right edge of either row steps out to Bayar.
    if (delta > 0 && index === row.length - 1) {
      setSelected("pay");
      setEditing(false);
      onFocusPay();
    }
  }

  /** Select and (where it makes sense) open the editor; used by clicks and Enter. */
  function activate(field: PayField) {
    setSelected(field);
    if (field === "pay") {
      onFocusPay();
      return;
    }
    if (field === "add" || field === "summary") {
      setOpen(true);
      setEditing(false);
      return;
    }
    setEditing(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Select menus portal out; their keys bubble through React, not the DOM.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (editing) return;
    // Ctrl/Cmd+Arrow belongs to the tab switcher; leave the grid selection alone.
    if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (!moveVertical(-1)) onExitUp();
        return;
      case "ArrowDown":
        event.preventDefault();
        moveVertical(1);
        return;
      case "ArrowLeft":
        event.preventDefault();
        moveHorizontal(-1);
        return;
      case "ArrowRight":
        event.preventDefault();
        moveHorizontal(1);
        return;
      case "Enter":
        event.preventDefault();
        activate(selected);
        return;
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        role="grid"
        tabIndex={0}
        aria-activedescendant={`cell-payment-${selected}`}
        onKeyDown={handleKeyDown}
        onClickCapture={onActivate}
        onFocusCapture={onActivate}
        className="flex min-w-0 flex-col outline-none"
      >
        <div className="grid grid-cols-12 border-b">
          <Cell
            id="cell-payment-rounding"
            className="col-span-12"
            label="Pembulatan"
            align="right"
            currency
            allowNegative
            singleClickEdit
            selected={focused && selected === "rounding"}
            editing={editing && selected === "rounding"}
            value={draft.rounding}
            display={rupiah(draft.rounding)}
            empty={draft.rounding === 0}
            placeholder="0"
            onSelect={() => activate("rounding")}
            onStartEdit={() => activate("rounding")}
            onEditingDone={() => setEditing(false)}
            onEditKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "Enter") {
                event.preventDefault();
                if (multiple || first === null) {
                  setEditing(false);
                  setOpen(true);
                } else {
                  setSelected("amount");
                  setEditing(true);
                }
                return true;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setEditing(false);
                onExitUp();
                return true;
              }
              return false;
            }}
            onChange={(raw) => run(service.transaction.set.rounding(draft.id, Number(raw) || 0))}
            onCommit={(raw) => run(service.transaction.set.rounding(draft.id, Number(raw) || 0))}
          />
        </div>

        <div className="grid grid-cols-12">
          {multiple ? (
            <div
              id="cell-payment-summary"
              onClick={() => activate("summary")}
              className={cn(
                "col-span-12 flex items-center p-1",
                focused && selected === "summary" && SELECTED_RING,
              )}
            >
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex min-w-0 items-center truncate">
                  {firstLabel}
                  <Plus className="icon shrink-0" />
                </span>
                <span className="shrink-0 font-bold tabular-nums">{rupiah(total, draft.fix)}</span>
                <span className="shrink-0 rounded-full bg-muted px-1.5 text-small font-bold tabular-nums text-muted-foreground">
                  {draft.methods.length}
                </span>
              </Button>
            </div>
          ) : first === null ? (
            <div
              id="cell-payment-add"
              onClick={() => activate("add")}
              className={cn(
                "col-span-12 flex items-center justify-center p-1",
                focused && selected === "add" && SELECTED_RING,
              )}
            >
              <Button variant="outline" className="w-full">
                <Plus className="icon" />
                Tambah metode
              </Button>
            </div>
          ) : (
            <>
              <SelectCell
                id="cell-payment-kind"
                className={cn("border-r", accounts.length > 0 ? "col-span-3" : "col-span-4")}
                label="Metode"
                selected={focused && selected === "kind"}
                editing={editing && selected === "kind"}
                value={kind}
                options={METHODS.map((candidate) => ({
                  value: candidate,
                  label: METHOD_NAMES[candidate],
                  kbd: METHOD_KBD[candidate],
                }))}
                onSelect={() => activate("kind")}
                onEditingDone={() => setEditing(false)}
                onChange={(value) =>
                  update(first.id, { methodId: defaultMethodId(catalog, value as MethodKind) })
                }
              />
              {accounts.length > 0 ? (
                <SelectCell
                  id="cell-payment-account"
                  className="col-span-3 border-r"
                  label="Akun"
                  selected={focused && selected === "account"}
                  editing={editing && selected === "account"}
                  value={accountId}
                  options={[
                    { value: METHOD_BASE_ID[kind], label: "--Pilih--" },
                    ...accounts.map((account) => ({
                      value: account.id,
                      label: account.name ?? "",
                    })),
                  ]}
                  onSelect={() => activate("account")}
                  onEditingDone={() => setEditing(false)}
                  onChange={(methodId) => update(first.id, { methodId })}
                />
              ) : null}
              <Cell
                id="cell-payment-amount"
                className={cn("border-r", accounts.length > 0 ? "col-span-5" : "col-span-7")}
                label="Nilai"
                align="right"
                currency
                singleClickEdit
                editId={PAYMENT_AMOUNT_ID}
                prefix={<Kbd>F2</Kbd>}
                selected={focused && selected === "amount"}
                editing={editing && selected === "amount"}
                value={first.value}
                display={rupiah(first.value)}
                empty={first.value === 0}
                placeholder="0"
                onSelect={() => activate("amount")}
                onStartEdit={() => activate("amount")}
                onEditingDone={() => setEditing(false)}
                onEditKeyDown={(event) => {
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setSelected("rounding");
                    setEditing(true);
                    return true;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setEditing(false);
                    return true;
                  }
                  return false;
                }}
                onChange={(raw) => update(first.id, { value: Number(raw) || 0 })}
                onCommit={(raw) => update(first.id, { value: Number(raw) || 0 })}
              />
              <AddCell
                selected={focused && selected === "add"}
                onActivate={() => activate("add")}
              />
            </>
          )}
        </div>
      </div>

      <Dialog modal={false} open={open} onOpenChange={setOpen}>
        {/* Radix drops its own overlay when the dialog is not modal, so draw one. */}
        <DialogPortal>
          <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setOpen(false)} />
        </DialogPortal>
        <DialogContent
          className="max-w-3xl"
          onOpenAutoFocus={(event) => {
            // The inline amount behind the dialog shares the id, so search
            // inside the content and land on the first method's field.
            event.preventDefault();
            const content = event.currentTarget as HTMLElement | null;
            const input = content?.querySelector<HTMLInputElement>(`#${PAYMENT_AMOUNT_ID}`);
            input?.focus();
            input?.select();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-big font-bold">Metode pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {draft.methods.map((method, index) => (
              <div key={method.id} className="flex flex-col gap-1 rounded-md  border p-2">
                <div className="flex gap-1 items-center">
                  <span className="w-4 shrink-0 pt-1.5 text-right text-small  text-muted-foreground tabular-nums select-none">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <MethodPicker
                      methodId={method.methodId}
                      catalog={catalog}
                      onChange={(methodId) => update(method.id, { methodId })}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="size-8 shrink-0 rounded-full"
                    title="Hapus pembayaran"
                    disabled={draft.methods.length <= 1}
                    onClick={() => set(draft.methods.filter((row) => row.id !== method.id))}
                  >
                    <X className="icon" />
                  </Button>
                </div>
                <InputCurrency
                  id={index === 0 ? PAYMENT_AMOUNT_ID : undefined}
                  className={cn(AMOUNT_CLASS, "text-right")}
                  placeholder="0"
                  value={method.value}
                  onValueChange={(value) => update(method.id, { value })}
                />
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={add}>
              <Plus className="icon" />
              Tambah metode
            </Button>
            <div className="flex items-center justify-between border-t pt-2 text-small tabular-nums">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{rupiah(total, draft.fix)}</span>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Selesai
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The small `+` cell that opens the method editor. */
function AddCell({ selected, onActivate }: { selected: boolean; onActivate: () => void }) {
  return (
    <div
      id="cell-payment-add"
      onClick={onActivate}
      className={cn("col-span-1 flex items-center justify-center", selected && SELECTED_RING)}
    >
      <Button
        variant="ghost"
        title="Metode pembayaran"
        onClick={(event) => {
          event.stopPropagation();
          onActivate();
        }}
      >
        <Plus className="icon" />
      </Button>
    </div>
  );
}

/**
 * A select as a grid cell: shows its label until entered, then opens the menu.
 * Clicking the cell edits in one click; the arrows keep it closed until Enter.
 */
function SelectCell({
  id,
  className,
  label,
  selected,
  editing,
  value,
  options,
  onSelect,
  onEditingDone,
  onChange,
}: {
  id: string;
  className?: string;
  label: string;
  selected: boolean;
  editing: boolean;
  value: string;
  options: readonly { value: string; label: string; kbd?: string }[];
  onSelect: () => void;
  onEditingDone: () => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (editing) setOpen(true);
  }, [editing]);

  const display = options.find((option) => option.value === value)?.label ?? value;
  return (
    <div
      id={id}
      onClick={() => {
        if (!editing) onSelect();
      }}
      className={cn(
        "flex flex-col justify-center gap-0.5 px-2 py-1",
        className,
        selected && (editing ? "z-10 ring-2 ring-primary ring-inset" : SELECTED_RING),
      )}
    >
      <span className="text-small leading-none text-muted-foreground select-none">{label}</span>
      <Select
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onEditingDone();
        }}
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-9 w-full border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7">
          <SelectValue>{display}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                className="small:w-[220px] w-[250px]"
                key={option.value}
                value={option.value}
                kbd={option.kbd === undefined ? undefined : <Kbd>{option.kbd}</Kbd>}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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
    <div className="flex min-w-0 gap-1">
      <Select
        value={kind}
        onValueChange={(value) => onChange(defaultMethodId(catalog, value as MethodKind))}
      >
        <SelectTrigger className="w-full">
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
          <SelectTrigger className="w-full">
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
