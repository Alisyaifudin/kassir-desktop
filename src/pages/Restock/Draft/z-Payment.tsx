import { Skeleton, SkeletonText } from "~/components/ui/skeleton";
import type Decimal from "decimal.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { formatDate, formatTime } from "~/lib/date";
import { pageData } from "../data";
import type { Draft } from "~/services/transaction";
import { paidTotal, roundMoney } from "~/lib/purchase";
import { rupiah } from "~/components/cart/util-rupiah";
import { Methods } from "~/components/cart/z-Methods";
import { Note } from "~/components/cart/z-Note";
import { PaymentTime } from "~/components/cart/z-PaymentTime";
import { Precision } from "~/components/cart/z-Precision";
import { FlipMode } from "~/components/cart/z-FlipMode";
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
 *
 * Buried in that same accordion is the way out of a purchase that was never one:
 * the cart becomes a sale and moves to Pos (`FlipMode`). It sits with the other
 * things that rewrite what the purchase *is*, not with the money.
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
  onSubmit,
}: {
  draft: Draft;
  grand: Decimal;
  focusPayment: number;
  focusRounding: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
  /** Enter on the last payment value pays the purchase; see z-Methods. */
  onSubmit: () => boolean;
}) {
  // The two catalogues are the page's own keys, so they load beside the drafts
  // rather than after them. Everything around them — the accordion's wording,
  // `Dibayar`/`Sisa`, `Pembayaran` — is chrome and is drawn at once; only the
  // method rows and the supplier's name wait.
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto scroll-gutter">
      <Body
        draft={draft}
        grand={grand}
        focusPayment={focusPayment}
        focusRounding={focusRounding}
        onFocusPay={onFocusPay}
        onExitUp={onExitUp}
        onCredit={onCredit}
        creditDisabled={creditDisabled}
        onSubmit={onSubmit}
      />
    </div>
  );
}

/** The purchase's payment shape before the first draft exists. */
export function PaymentLoading() {
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
  focusPayment,
  focusRounding,
  onFocusPay,
  onExitUp,
  onCredit,
  creditDisabled,
  onSubmit,
}: {
  draft: Draft;
  grand: Decimal;
  focusPayment: number;
  focusRounding: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
  /** Enter on the last payment value pays the purchase; see z-Methods. */
  onSubmit: () => boolean;
}) {
  const methodsRes = pageData.use("methods");
  const suppliersRes = pageData.use("suppliers");
  const catalog = methodsRes.type === "success" ? methodsRes.data : null;
  const suppliers = suppliersRes.type === "success" ? suppliersRes.data : null;
  const refresh = pageData.useRefresh();

  const paid = roundMoney(paidTotal(draft.methods), draft.fix);
  const change = paid.minus(grand);
  const supplierName =
    suppliers === null
      ? null
      : (suppliers.find((supplier) => supplier.id === draft.supplierId)?.name ?? "—");

  return (
    <div className="mx-auto flex w-full  flex-col">
      <div className="flex items-start gap-2 border-b pr-2">
        <Accordion type="single" collapsible className="min-w-0 flex-1">
          <AccordionItem value="info" className="border-b-0">
            <AccordionTrigger className="px-2 py-1 hover:no-underline">
              <span className="flex min-w-0 items-center gap-3">
                <span className="font-medium">Info pembelian</span>
                <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <CashierName />
                  <span className="flex min-w-0 items-center gap-1 truncate">
                    Pemasok:{" "}
                    {supplierName === null ? (
                      <SkeletonText className="w-24" />
                    ) : (
                      <span className="truncate">{supplierName}</span>
                    )}{" "}
                    · Presisi {draft.fix}
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
                <div className="flex justify-between items-center">
                  <PaymentTime draft={draft} />
                  <div className="flex justify-end">
                    <FlipMode draft={draft} className="items-end" />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Kredit onCredit={onCredit} disabled={creditDisabled} />
      </div>

      {methodsRes.type === "error" ? (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1 text-sm text-destructive">
          <span role="alert">
            Daftar metode pembayaran gagal dimuat: {methodsRes.error.message}
          </span>
          <Button size="sm" variant="outline" onClick={() => refresh("methods")}>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {suppliersRes.type === "error" ? (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1 text-sm text-destructive">
          <span role="alert">Daftar pemasok gagal dimuat: {suppliersRes.error.message}</span>
          <Button size="sm" variant="outline" onClick={() => refresh("suppliers")}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      <Images draft={draft} />

      <div className="mt-4 px-2 pb-4">
        <h3 className="mb-2 text-base font-bold select-none">Pembayaran</h3>
        <Methods
          draft={draft}
          catalog={catalog}
          focusPayment={focusPayment}
          focusRounding={focusRounding}
          onFocusPay={onFocusPay}
          onExitUp={onExitUp}
          focused={true}
          onActivate={() => {}}
          onSubmit={onSubmit}
        />
        <div className="mt-3 flex items-center justify-between border-t pt-2 ">
          <span className="text-2xl">
            Dibayar:{" "}
            <span className="font-bold text-2xl tabular-nums">{rupiah(paid, draft.fix)}</span>
          </span>
          <span className={cn("text-2xl", change.isNegative() && "text-destructive")}>
            {change.isNegative() ? "Sisa" : "Kembalian"}
            {": "}
            <span className="font-bold text-5xl tabular-nums">
              {rupiah(change.abs(), draft.fix)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
