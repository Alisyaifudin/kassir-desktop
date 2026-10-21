import type Decimal from "decimal.js";
import { type Extra, type Line } from "~/components/cart/types";
import { linesSubtotal } from "~/lib/purchase";
import { Extras } from "~/components/cart/z-Extras";
import { Listing } from "~/components/cart/z-Listing";
import { Payment } from "./z-Payment";
import { CartPanel, Tabs } from "~/components/cart/z-Tabs";
import type { Draft as DraftModel } from "~/services/transaction";
import type { LineIssue } from "~/components/cart/code-issues";

/**
 * The stages the panel walks through, in order: choose the goods, then the
 * charges on the purchase as a whole, then settle it.
 */
export const STAGES = ["listing", "extras", "payment"] as const;

export type Stage = (typeof STAGES)[number];

/**
 * The purchase being assembled: which draft is open, and which stage of
 * building it is showing. What it costs lives in the bottom panel — see
 * page.tsx.
 */
export function Draft({
  draft,
  drafts,
  onSelect,
  stage,
  grand,
  lines,
  onLines,
  issues,
  extras,
  onExtras,
  focusSearch,
  focusPayment,
  focusRounding,
  focusLast,
  onFocusPay,
  onExitUp,
  onCredit,
  creditDisabled,
}: {
  draft: DraftModel;
  drafts: DraftModel[];
  onSelect: (id: string) => void;
  stage: Stage;
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  issues: Map<string, LineIssue>;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
  focusSearch: number;
  /** F2's token: the payment stage puts its cursor on the first amount. */
  focusPayment: number;
  focusRounding: number;
  focusLast: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
}) {
  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden">
      <Tabs mode="purchase" drafts={drafts} activeId={draft.id} onSelect={onSelect} />
      <CartPanel draftId={draft.id}>
        <StageBody
          stage={stage}
          draft={draft}
          grand={grand}
          lines={lines}
          onLines={onLines}
          issues={issues}
          extras={extras}
          onExtras={onExtras}
          focusPayment={focusPayment}
          focusSearch={focusSearch}
          focusRounding={focusRounding}
          focusLast={focusLast}
          onFocusPay={onFocusPay}
          onExitUp={onExitUp}
          onCredit={onCredit}
          creditDisabled={creditDisabled}
        />
      </CartPanel>
    </section>
  );
}

function StageBody({
  stage,
  draft,
  grand,
  lines,
  onLines,
  issues,
  extras,
  onExtras,
  focusPayment,
  focusSearch,
  focusRounding,
  focusLast,
  onFocusPay,
  onExitUp,
  onCredit,
  creditDisabled,
}: {
  stage: Stage;
  draft: DraftModel;
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  issues: Map<string, LineIssue>;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
  focusPayment: number;
  focusSearch: number;
  focusRounding: number;
  focusLast: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
}) {
  if (stage === "listing") {
    return (
      <Listing
        mode="purchase"
        lines={lines}
        issues={issues}
        onChange={onLines}
        focusSearch={focusSearch}
        focusLast={focusLast}
      />
    );
  }
  if (stage === "extras") {
    return (
      <Extras
        mode="purchase"
        extras={extras}
        subtotal={linesSubtotal(lines)}
        onChange={onExtras}
        focusSearch={focusSearch}
      />
    );
  }
  return (
    <Payment
      // Keyed by draft: the payment stage holds dialog state (`Kredit`), amounts
      // and detail fields that belong to one purchase. Remounting on a tab
      // switch means nothing dialog-shaped can outlive the cart it describes.
      key={draft.id}
      draft={draft}
      grand={grand}
      focusPayment={focusPayment}
      focusRounding={focusRounding}
      onFocusPay={onFocusPay}
      onExitUp={onExitUp}
      onCredit={onCredit}
      creditDisabled={creditDisabled}
    />
  );
}
