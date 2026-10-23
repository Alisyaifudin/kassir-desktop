import { LoaderMany, useStream } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import type Decimal from "decimal.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { cn } from "~/lib/utils";
import { formatDate, formatTime } from "~/lib/date";
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft } from "~/services/transaction";
import { paidTotal, roundMoney } from "~/lib/purchase";
import { rupiah } from "~/components/cart/util-rupiah";
import { Methods } from "~/components/cart/z-Methods";
import { Note } from "~/components/cart/z-Note";
import { PaymentTime } from "~/components/cart/z-PaymentTime";
import { Precision } from "~/components/cart/z-Precision";
import { Supplier } from "./z-Supplier";
import { Images } from "./z-Images";
import { Kredit } from "./z-Kredit";
import { CashierName } from "../z-CashierName";

/**
 * Stage three: settling the purchase.
 *
 * The optional details — cashier, note, supplier, precision, and the time the
 * record is settled — sit in an accordion that stays out of the way of the two
 * things that matter: what is owed (the grand total below) and what has been
 * paid.
 */
export function Payment({
  draft,
  grand,
  focusPayment,
  focusRounding,
  onFocusPay,
  onExitUp,
  onCredit,
  creditDisabled,
}: {
  draft: Draft;
  grand: Decimal;
  focusPayment: number;
  focusRounding: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
}) {
  const res = {
    catalog: useStream(service.method.get.catalogChanges),
    suppliers: useStream(service.supplier.get.changes),
  };
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto scroll-gutter">
      <LoaderMany res={res} fallback={<PaymentLoading />}>
        {({ catalog, suppliers }) => (
          <Body
            draft={draft}
            grand={grand}
            catalog={catalog}
            suppliers={suppliers}
            focusPayment={focusPayment}
            focusRounding={focusRounding}
            onFocusPay={onFocusPay}
            onExitUp={onExitUp}
            onCredit={onCredit}
            creditDisabled={creditDisabled}
          />
        )}
      </LoaderMany>
    </div>
  );
}

/** The purchase's payment/supplier form while its two catalogues load. */
function PaymentLoading() {
  return (
    <div className="flex flex-col gap-3 p-2" aria-busy="true" aria-label="Memuat pembayaran">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

function Body({
  draft,
  grand,
  catalog,
  suppliers,
  focusPayment,
  focusRounding,
  onFocusPay,
  onExitUp,
  onCredit,
  creditDisabled,
}: {
  draft: Draft;
  grand: Decimal;
  catalog: MethodCatalog;
  suppliers: { id: string; name: string }[];
  focusPayment: number;
  focusRounding: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
}) {
  const paid = roundMoney(paidTotal(draft.methods), draft.fix);
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
                <span className="flex min-w-0 items-center gap-2 text-small text-muted-foreground">
                  <CashierName />
                  <span className="truncate">
                    Pemasok: {supplierName} · Presisi {draft.fix}
                    {/* A backdated pick must not hide behind a collapsed
                        accordion: the record is written with it, not with now. */}
                    {draft.paidAt === null
                      ? null
                      : ` · ${formatDate(draft.paidAt, "short")} ${formatTime(draft.paidAt)}`}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <Note draft={draft} />
                    <Supplier draft={draft} />
                  </div>
                  <Precision draft={draft} />
                </div>
                <PaymentTime draft={draft} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Kredit onCredit={onCredit} disabled={creditDisabled} />
      </div>

      <Images draft={draft} />

      <div className="mt-4 px-2 pb-4">
        <h3 className="mb-2 text-normal font-bold select-none">Pembayaran</h3>
        <Methods
          draft={draft}
          catalog={catalog}
          focusPayment={focusPayment}
          focusRounding={focusRounding}
          onFocusPay={onFocusPay}
          onExitUp={onExitUp}
          focused={true}
          onActivate={() => {}}
        />
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
