import type Decimal from "decimal.js";
import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Loader, useStream } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { Button } from "~/components/ui/button";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { METHOD_BY_KEY } from "~/lib/constants";
import { useUser } from "~/hooks/use-user";
import { capitalize, cn } from "~/lib/utils";
import { service } from "~/services";
import { MethodError, type MethodCatalog } from "~/services/method";
import type { RecordMode } from "~/services/record";
import { rupiah } from "~/components/cart/util-rupiah";
import { MethodPicker, defaultMethodId } from "~/components/MethodPicker";
import { ModeSwitch } from "./z-ModeSwitch";
import { Note } from "./z-Note";
import { Kbd } from "~/components/ui/kdb";

const MethodErrorBoundary = createErrorBoundary(MethodError);

/**
 * The settle bar. The record-level choices sit in two short rows on the left —
 * which way the money moved beside how it was paid (kind, then the account
 * inside that kind), the note beside who wrote it — while the right half carries
 * the one action and the total it settles.
 *
 * One method, no rounding, no split, no precision; `Simpan` writes the record.
 */
export function Bottom({
  total,
  note,
  onNote,
  mode,
  onMode,
  methodId,
  onMethod,
  pending,
  onSubmit,
}: {
  total: Decimal;
  note: string;
  onNote: (note: string) => void;
  mode: RecordMode;
  onMode: (mode: RecordMode) => void;
  methodId: string | null;
  onMethod: (id: string) => void;
  /** A save is in flight; the button says so and refuses a second one. */
  pending: boolean;
  onSubmit: () => void;
}) {
  const simpanRef = useRef<HTMLButtonElement>(null);
  const [simpanFocused, setSimpanFocused] = useState(false);

  // F1 puts the cursor on `Simpan` — the one action this screen exists for. A
  // dialog owns the keyboard while it is open (the note), so the shortcut waits.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F2" || isScreenOwnedByDialog()) return;
      event.preventDefault();
      simpanRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section className="flex flex-none flex-col items-stretch border-t lg:flex-row">
      <div className="flex min-w-0 shrink-0 flex-col gap-2 border-b p-2 lg:min-w-[420px] lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center gap-2">
          <MethodFields value={methodId} onChange={onMethod} />
          <ModeSwitch value={mode} onChange={onMode} />
        </div>

        <div className="flex items-center gap-2">
          <Note value={note} onChange={onNote} />
          <Cashier />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-start px-2 py-2">
          <Button
            ref={simpanRef}
            className={cn(
              "w-[180px] transition-shadow",
              simpanFocused && "shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
            disabled={!total.gt(0) || methodId === null || pending}
            aria-keyshortcuts="F1"
            title="Simpan (F1)"
            onFocus={() => setSimpanFocused(true)}
            onBlur={() => setSimpanFocused(false)}
            onClick={onSubmit}
          >
            {pending ? "Menyimpan..." : "Simpan"}
            <Kbd>F2</Kbd>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden px-2 pb-2">
          <span
            data-testid="transaction-total"
            className="text-big font-semibold tabular-nums xl:text-grand-total"
          >
            {rupiah(total)}
          </span>
        </div>
      </div>
    </section>
  );
}

function MethodFields({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const res = useStream(service.method.get.catalogChanges);

  return (
    <MethodErrorBoundary
      fallback={({ error }) => (
        <span role="alert" className="text-small text-destructive">
          Metode gagal dimuat: {error.message}
        </span>
      )}
    >
      <Loader res={res} fallback={<Skeleton className="h-11 w-[320px] max-w-full" />}>
        {({ data }) => <MethodSelect catalog={data} value={value} onChange={onChange} />}
      </Loader>
    </MethodErrorBoundary>
  );
}

function MethodSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: MethodCatalog;
  value: string | null;
  onChange: (id: string) => void;
}) {
  // `cash` is not a defaultable kind, but it is the sensible first pick here.
  const selected = value ?? defaultMethodId(catalog, "cash");

  // Lift the default into the page's state: `Simpan` can only write a record
  // once a method is actually chosen.
  useEffect(() => {
    if (value === null) onChange(selected);
  }, [value, selected, onChange]);

  // Ctrl+0..3 pick the kind, as they do on the cart's payment strip. Changing
  // the kind lands on its default account, never on the previous kind's.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (isScreenOwnedByDialog()) return;
      const kind = METHOD_BY_KEY[event.key];
      if (kind === undefined) return;
      event.preventDefault();
      onChange(defaultMethodId(catalog, kind));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [catalog, onChange]);

  return (
    <div className="w-[320px] max-w-full">
      <MethodPicker methodId={selected} catalog={catalog} onChange={onChange} />
    </div>
  );
}

/** Who is writing this record: the authenticated cashier, read-only. */
function Cashier() {
  const user = useUser();
  const name = capitalize(user.name);
  return (
    <span
      className="flex min-w-0 items-center gap-1 text-small text-muted-foreground select-none"
      title={`Kasir: ${name}`}
    >
      <UserRound className="icon shrink-0" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  );
}
