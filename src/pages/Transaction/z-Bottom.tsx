import type Decimal from "decimal.js";
import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { useUser } from "~/hooks/use-user";
import { METHOD_NAMES } from "~/lib/constants";
import { capitalize, cn } from "~/lib/utils";
import { service } from "~/services";
import { MethodError, type MethodCatalog } from "~/services/method";
import type { RecordMode } from "~/services/record";
import { rupiah } from "~/components/cart/util-rupiah";
import { Note } from "./z-Note";

const MethodErrorBoundary = createErrorBoundary(MethodError);

/**
 * The settle bar. The record-level choices sit in two short rows on the left —
 * which way the money moved beside how it was paid, the note beside who wrote
 * it — while the right half carries the one action and the total it settles.
 *
 * One method, no rounding, no split, no precision; `Simpan` is still a mock.
 */
export function Bottom({
  total,
  note,
  onNote,
  mode,
  onMode,
  methodId,
  onMethod,
  onSubmit,
}: {
  total: Decimal;
  note: string;
  onNote: (note: string) => void;
  mode: RecordMode;
  onMode: (mode: RecordMode) => void;
  methodId: string | null;
  onMethod: (id: string) => void;
  onSubmit: () => void;
}) {
  const simpanRef = useRef<HTMLButtonElement>(null);
  const [simpanFocused, setSimpanFocused] = useState(false);

  // F1 puts the cursor on `Simpan` — the one action this screen exists for. A
  // dialog owns the keyboard while it is open (the note), so the shortcut waits.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F1" || isScreenOwnedByDialog()) return;
      event.preventDefault();
      simpanRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section className="flex flex-none flex-col items-stretch border-t lg:flex-row">
      <div className="flex min-w-0 shrink-0 flex-col gap-2 border-b p-2 lg:min-w-[420px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2">
          <MethodPicker value={methodId} onChange={onMethod} />
          <Select value={mode} onValueChange={(value) => onMode(value as RecordMode)}>
            <SelectTrigger
              id="transaction-mode"
              aria-label="Jenis transaksi"
              className="w-[150px] text-normal"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incoming" className="text-normal">
                Masuk
              </SelectItem>
              <SelectItem value="outcoming" className="text-normal">
                Keluar
              </SelectItem>
            </SelectContent>
          </Select>
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
            disabled={!total.gt(0)}
            aria-keyshortcuts="F1"
            title="Simpan (F1)"
            onFocus={() => setSimpanFocused(true)}
            onBlur={() => setSimpanFocused(false)}
            onClick={onSubmit}
          >
            Simpan
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

function MethodPicker({
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
      <Loader res={res} fallback={<Loading />}>
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
  const methods = catalog.methods;
  // `cash` is not a defaultable kind, but it is the sensible first pick here.
  const fallback = methods.find((method) => method.kind === "cash") ?? methods[0];
  const selected = value ?? fallback?.id ?? "";

  return (
    <Select value={selected} onValueChange={onChange} disabled={methods.length === 0}>
      <SelectTrigger
        id="transaction-method"
        aria-label="Metode pembayaran"
        className="w-[220px] text-normal"
      >
        <SelectValue placeholder="Pilih metode" />
      </SelectTrigger>
      <SelectContent>
        {methods.map((method) => (
          <SelectItem key={method.id} value={method.id} className="text-normal">
            {method.name ?? METHOD_NAMES[method.kind]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
