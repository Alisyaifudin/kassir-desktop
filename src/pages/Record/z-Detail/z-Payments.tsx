import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { InputCurrency } from "~/components/ui/input-currency";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Loader, useStream } from "~/components/Loader";
import { MethodPicker } from "~/components/MethodPicker";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { PaymentsEditor } from "./use-payments";

/** The `Input` chrome, so the amount cell sits in its row like the method cells. */
const AMOUNT_CLASS =
  "flex w-[250px] shrink-0 rounded-md border border-input bg-transparent px-2 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The payment rows as fields: one method (kind + account) and one amount per
 * row, each removable, then `Batalkan | Simpan | +`. The caller owns the money
 * grid and this returns its cells, so the amounts stay under the numbers they
 * belong to while they are edited — and the band does not jump between reading
 * and editing.
 *
 * The catalog is read here, and only while the rows are fields: the read side
 * names its methods from the record's own snapshot, so displaying a payment
 * never needs the catalogue. `Batalkan`, `Simpan` and `+` sit outside that read,
 * so a slow or failed catalog can never trap the cashier in the editor.
 */
export function PaymentEditor({ pay }: { pay: PaymentsEditor }) {
  const res = useStream(service.method.get.catalogChanges);

  return (
    <>
      <Loader
        res={res}
        fallback={pay.draft.map((payment) => (
          // A row keeps its place and its height while the catalog loads.
          <div key={payment.id} className="col-span-12 py-1">
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      >
        {({ data: catalog }) =>
          pay.draft.map((payment, index) => (
            <div key={payment.id} className="col-span-12 flex items-center gap-1 border-b py-1">
              <div className="flex-1"/>
              <div className="min-w-[500px]  w-fit">
                <MethodPicker
                  methodId={payment.methodId}
                  catalog={catalog}
                  onChange={(methodId) => pay.patch(payment.id, { methodId })}
                />
              </div>
              <InputCurrency
                className={cn(AMOUNT_CLASS, "text-right")}
                placeholder="0"
                aria-label={`Jumlah pembayaran ${index + 1}`}
                value={payment.pay}
                onValueChange={(value) => pay.patch(payment.id, { pay: value })}
                disabled={pay.pending}
              />
              {/* The last row stays: a record is settled by at least one
                  method, and an empty list would have nothing to save. */}
              <Button
                variant="destructive"
                size="icon"
                type="button"
                className="size-8 shrink-0 rounded-full"
                aria-label={`Hapus pembayaran ${index + 1}`}
                title="Hapus pembayaran"
                disabled={pay.pending || pay.draft.length <= 1}
                onClick={() => pay.remove(payment.id)}
              >
                <X className="size-5" />
              </Button>
            </div>
          ))
        }
      </Loader>

      <div className="col-span-12 flex items-center justify-end gap-10 py-1">
        <Button variant="secondary" type="button" disabled={pay.pending} onClick={pay.cancel}>
          Batalkan
        </Button>
        <Button type="button" disabled={pay.pending} onClick={() => void pay.save()}>
          Simpan <Spinner when={pay.pending} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Tambah metode"
          title="Tambah metode"
          disabled={pay.pending}
          onClick={() => pay.add()}
        >
          <Plus className="size-5" />
        </Button>
      </div>
      <TextError className="col-span-12 text-right">{pay.error}</TextError>
    </>
  );
}
