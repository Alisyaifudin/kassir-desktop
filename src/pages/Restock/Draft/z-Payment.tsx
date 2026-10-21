import { LoaderMany, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import type Decimal from "decimal.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { InputCurrency } from "~/components/ui/input-currency";
import { capitalize, cn } from "~/lib/utils";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft } from "~/services/transaction";
import { paidTotal } from "~/lib/purchase";
import { run } from "../run";
import { rupiah } from "../util-rupiah";
import { Methods } from "./z-Methods";
import { Note } from "./z-Note";
import { Precision } from "./z-Precision";
import { Supplier } from "./z-Supplier";
import { Images } from "./z-Images";
import { Kredit } from "./z-Kredit";

/** The default `Input` chrome, so a currency field sits in the row like one. */
const AMOUNT_CLASS =
  "flex w-full text-normal rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Stage three: settling the purchase.
 *
 * The optional details — cashier, note, supplier, precision — sit in an
 * accordion that stays out of the way of the two things that matter: what is
 * owed (the grand total below) and what has been paid.
 */
export function Payment({
  draft,
  grand,
  focusPayment,
}: {
  draft: Draft;
  grand: Decimal;
  focusPayment: number;
}) {
  const res = {
    catalog: useStream(service.method.get.catalogChanges),
    suppliers: useStream(service.supplier.get.changes),
  };
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto scroll-gutter">
      <LoaderMany res={res} fallback={<Loading />}>
        {({ catalog, suppliers }) => (
          <Body
            draft={draft}
            grand={grand}
            catalog={catalog}
            suppliers={suppliers}
            focusPayment={focusPayment}
          />
        )}
      </LoaderMany>
    </div>
  );
}

function Body({
  draft,
  grand,
  catalog,
  suppliers,
  focusPayment,
}: {
  draft: Draft;
  grand: Decimal;
  catalog: MethodCatalog;
  suppliers: { id: string; name: string }[];
  focusPayment: number;
}) {
  const cashier = useUser().name ?? "admin";
  const paid = paidTotal(draft.methods);
  const change = paid.minus(grand);
  const supplierName = suppliers.find((supplier) => supplier.id === draft.supplierId)?.name ?? "—";

  return (
    <div className="mx-auto flex w-full  flex-col">
      <div className="flex items-start gap-2 border-b pr-2">
        <Accordion type="single" collapsible className="min-w-0 flex-1">
          <AccordionItem value="info" className="border-b-0">
            <AccordionTrigger className="px-2 py-1 hover:no-underline">
              <span className="flex min-w-0 items-center gap-3">
                <span className="font-medium">Info pembelian</span>
                <span className="truncate text-small text-muted-foreground">
                  Kasir: {capitalize(cashier)} · Pemasok: {supplierName} · Presisi {draft.fix}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-end gap-4">
                  <Note draft={draft} />
                  <Supplier draft={draft} />
                </div>
                <Precision draft={draft} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Kredit />
      </div>

      <Images draft={draft} />

      <label className="mt-3 grid grid-cols-[170px_1fr] items-center gap-2 px-2 small:grid-cols-[120px_1fr]">
        <span className="select-none">Pembulatan</span>
        <InputCurrency
          className={cn(AMOUNT_CLASS, "text-right")}
          placeholder="0"
          allowNegative
          value={draft.rounding}
          onValueChange={(rounding) => run(service.transaction.set.rounding(draft.id, rounding))}
        />
      </label>

      <div className="mt-4 px-2 pb-4">
        <h3 className="mb-2 text-normal font-bold select-none">Pembayaran</h3>
        <Methods draft={draft} catalog={catalog} focusPayment={focusPayment} />
        <div className="mt-3 flex items-center justify-between border-t pt-2 ">
          <span className="text-big">
            Dibayar:{" "}
            <span className="font-bold text-big tabular-nums">{rupiah(paid, draft.fix)}</span>
          </span>
          <span className={cn("text-big", change.isNegative() && "text-destructive")}>
            {change.isNegative() ? "Sisa" : "Kembalian"}
            {": "}
            <span className="font-bold text-change tabular-nums">
              {rupiah(change.abs(), draft.fix)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
