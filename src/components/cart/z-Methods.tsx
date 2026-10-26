import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { InputCurrency } from "~/components/ui/input-currency";
import { Kbd } from "~/components/ui/kdb";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  METHOD_BASE_ID,
  METHODS,
  METHOD_NAMES,
  METHOD_BY_KEY,
  type MethodKind,
  METHOD_KBD,
} from "~/lib/constants";
import { generateId } from "~/lib/random";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { ReservedSkeleton } from "~/components/page-data";
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft, DraftMethod } from "~/services/transaction";
import { paidTotal } from "~/lib/purchase";
import { run } from "~/components/cart/run";
import { rupiah } from "~/components/cart/util-rupiah";
import { Cell, SELECTED_RING, typedDigit } from "~/components/cart/z-Cell";
import { SelectCell } from "~/components/cart/z-SelectCell";
import { MethodPicker, defaultMethodId } from "~/components/MethodPicker";
import { nextFreeKind, freeMethodId } from "~/components/cart/method-kinds";
import { useInertApp } from "~/components/cart/use-inert-app";

/** The default `Input` chrome, so a currency field sits in the row like one. */
const AMOUNT_CLASS =
  "flex w-full text-normal rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/** The first amount field, so F2 (see page) can land on it. */
const PAYMENT_AMOUNT_ID = "payment-amount-0";

/** The cells of the settle grid, in navigation order. */
type PayField = "rounding" | "kind" | "account" | "amount" | "add" | "summary" | "pay";

/**
 * The settle strip, shared by the sale (Pos) and the purchase (Restock)
 * screens: a grid in the same idiom as the main panel — one cell at a time,
 * arrows to move, Enter to edit. A click is enough to select *and* edit; the
 * keyboard keeps selection and editing separate.
 *
 * The two screens differ in exactly two ways, both passed in:
 *   * `onSubmit` — on a sale, Enter on an underpaid amount must keep the editor
 *     open so the shortfall can be fixed. The callback answers "may I leave the
 *     editor?"; a purchase passes nothing and Enter always leaves.
 *   * `focusTop` — the sale screen hands the grid downward from the cart above,
 *     which lands the cursor on Pembulatan. A purchase has no such hand-off.
 *
 * A lone method stays inline — kind, account, amount — with `+` opening the
 * full editor. A second method collapses that row into a summary cell that
 * opens the same editor.
 */
export function Methods({
  draft,
  catalog,
  focusPayment,
  focusTop,
  onExitUp,
  focused,
  onActivate,
  onFocusPay,
  focusRounding,
  onSubmit,
}: {
  draft: Draft;
  /**
   * `null` while the method catalogue is still loading: the rounding row needs
   * only the draft, so it is drawn and usable, and only the method rows wait.
   */
  catalog: MethodCatalog | null;
  focusPayment: number;
  /** The cart's hand-off downward; omit it on a screen that has no cart above. */
  focusTop?: number;
  onExitUp: () => void;
  focused: boolean;
  onActivate: () => void;
  onFocusPay: () => void;
  focusRounding: number;
  /** Answers "may Enter leave the editor?" — a sale keeps an underpaid one open. */
  onSubmit?: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  // The dialog is not trapped (see the comment on the Dialog below), so the app
  // shell is made inert while it is open: Tab must not reach the cart behind it.
  useInertApp(open);
  const [selected, setSelected] = useState<PayField>("rounding");
  const [editing, setEditing] = useState(false);
  // The digit that opened the editor, if a keystroke did (see `typedDigit`).
  const [seed, setSeed] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasEditing = useRef(false);
  // The shortcut handler lives in an effect; keep the latest draft reachable
  // without re-registering on every keystroke.
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  // The main grid's hand-off downward; skip the value at mount.
  const seenFocusTop = useRef(focusTop);
  // Bayar's hand-off back to Pembulatan.
  const seenFocusRounding = useRef(focusRounding);

  const set = (methods: DraftMethod[]) => run(service.transaction.methods.set(draft.id, methods));

  const first = draft.methods[0] ?? null;
  const multiple = draft.methods.length > 1;
  const firstMethod = catalog?.methods.find((method) => method.id === first?.methodId);
  const kind: MethodKind = firstMethod?.kind ?? "cash";
  const accounts =
    catalog === null
      ? []
      : catalog.methods.filter((candidate) => candidate.kind === kind && candidate.name !== null);
  const accountId =
    first !== null && accounts.some((account) => account.id === first.methodId)
      ? first.methodId
      : METHOD_BASE_ID[kind];
  // An account (Shopee, BCA) reads better than its kind; the kind is the fallback.
  const firstLabel = firstMethod?.name ?? METHOD_NAMES[kind];
  const total = paidTotal(draft.methods);
  // One method per transaction: `+` adds the first method this draft does not
  // pay with yet (cash → QRIS → transfer → debit, and inside a kind the first
  // free account), and each row's picker hides the ids the other rows hold.
  const used = new Set(draft.methods.map((method) => method.methodId));
  const nextKind = catalog === null ? null : nextFreeKind(catalog, used);

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
  // Without the catalogue there is only the rounding row to move around in.
  const rows: PayField[][] = catalog === null ? [["rounding"]] : [["rounding"], methodRow];

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

  // Unified grid: when the main grid hands off downward, land on Pembulatan.
  useEffect(() => {
    if (focusTop === undefined || focusTop === seenFocusTop.current) return;
    seenFocusTop.current = focusTop;
    setSelected("rounding");
    setEditing(false);
    containerRef.current?.focus();
  }, [focusTop]);

  // Bayar pressed Left: come back to Pembulatan.
  useEffect(() => {
    if (focusRounding === seenFocusRounding.current) return;
    seenFocusRounding.current = focusRounding;
    setSelected("rounding");
    setEditing(false);
    containerRef.current?.focus();
  }, [focusRounding]);

  // With a single method, Ctrl+0..3 swap its kind (and default account).
  // Deliberately not behind `isScreenOwnedByDialog`: this dialog *is* the owner,
  // and its own shortcuts must keep working while it is open.
  useEffect(() => {
    if (catalog === null || multiple || first === null) return;
    const firstMethodId = first.id;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const kind = METHOD_BY_KEY[event.key];
      if (kind === undefined) return;
      if (catalog === null) return;
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
    if (catalog === null || nextKind === null) return;
    set([
      ...draft.methods,
      { id: generateId(), methodId: freeMethodId(catalog, nextKind, used), value: 0 },
    ]);
  }

  /** The method ids the *other* rows pay with — never one this row already is. */
  function takenByOthers(rowId: string): string[] {
    return draft.methods.filter((row) => row.id !== rowId).map((row) => row.methodId);
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

  /** Leave the editor. A seed belongs to the keystroke that opened it, so it goes. */
  function stopEditing() {
    setSeed(null);
    setEditing(false);
  }

  /** Select and (where it makes sense) open the editor; used by clicks and Enter. */
  function activate(field: PayField) {
    // Enter or a click opens the editor on the value, not on a key typed earlier.
    setSeed(null);
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
    // A digit on a selected amount cell opens its editor with that digit, so the
    // value is replaced rather than appended to — no Enter, no Backspace first.
    const numeric =
      selected === "rounding" || (selected === "amount" && methodRow.includes("amount"));
    const typed = numeric ? typedDigit(event) : null;
    if (typed !== null) {
      event.preventDefault();
      setSeed(typed);
      setEditing(true);
      return;
    }
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
            seed={seed}
            value={draft.rounding}
            display={rupiah(draft.rounding)}
            empty={draft.rounding === 0}
            placeholder="0"
            onSelect={() => activate("rounding")}
            onStartEdit={() => activate("rounding")}
            onEditingDone={stopEditing}
            onEditKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "Enter") {
                event.preventDefault();
                if (multiple || first === null) {
                  stopEditing();
                  setOpen(true);
                } else {
                  setSeed(null);
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
          {catalog === null ? (
            // The rounding row above is live; the rows that need the catalogue
            // hold their place with one line the height of a method row —
            // reserved at once, drawn only if the catalogue is slow.
            <ReservedSkeleton className="col-span-12 flex items-center p-1">
              {/* A real payment row is 70 tall big, 56 small. */}
              <Skeleton className="h-[70px] w-full small:h-[56px]" />
            </ReservedSkeleton>
          ) : multiple ? (
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
                onEditingDone={stopEditing}
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
                  onEditingDone={stopEditing}
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
                seed={seed}
                value={first.value}
                display={rupiah(first.value)}
                empty={first.value === 0}
                placeholder="0"
                onSelect={() => activate("amount")}
                onStartEdit={() => activate("amount")}
                onEditingDone={stopEditing}
                onEditKeyDown={(event) => {
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setSeed(null);
                    setSelected("rounding");
                    setEditing(true);
                    return true;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    // Underpaid: stay in the editor so the amount can be fixed.
                    if (onSubmit?.() ?? true) setEditing(false);
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

      {/* `modal={false}` keeps Radix's focus trap from reclaiming focus out of the
          method `Select`'s portal (React 19; upstream fix unmerged). The app shell
          is made inert instead, so the keyboard cannot leave this dialog, and
          `aria-modal` tells a screen reader the rest of the page is covered. */}
      <Dialog modal={false} open={open} onOpenChange={setOpen}>
        {/* Radix drops its own overlay when the dialog is not modal, so draw one. */}
        <DialogPortal>
          <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setOpen(false)} />
        </DialogPortal>
        <DialogContent
          aria-modal="true"
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
          <DialogDescription>
            Metode dan jumlah pembayaran; sisanya menjadi kembalian.
          </DialogDescription>
          <div className="flex flex-col gap-3">
            {draft.methods.map((method, index) => (
              <div key={method.id} className="flex flex-col gap-1 rounded-md  border p-2">
                <div className="flex gap-1 items-center">
                  <span className="w-4 shrink-0 pt-1.5 text-right text-small  text-muted-foreground tabular-nums select-none">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    {catalog === null ? (
                      <Skeleton className="h-11 w-full" />
                    ) : (
                      <MethodPicker
                        methodId={method.methodId}
                        catalog={catalog}
                        excludeMethodIds={takenByOthers(method.id)}
                        onChange={(methodId) => update(method.id, { methodId })}
                      />
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="size-8 shrink-0 rounded-full"
                    aria-label="Hapus pembayaran"
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
            <Button
              variant="outline"
              className="w-full"
              onClick={add}
              // Every method taken: a transaction names each method once, so
              // there is nothing left for another row to be.
              disabled={nextKind === null}
              title={nextKind === null ? "Semua metode sudah dipakai" : undefined}
            >
              <Plus className="icon" />
              Tambah metode
            </Button>
            {nextKind === null ? (
              <p className="text-small text-muted-foreground">
                Semua metode sudah dipakai; satu transaksi memakai tiap metode sekali.
              </p>
            ) : null}
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
