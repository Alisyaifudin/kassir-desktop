import { useEffect, useState } from "react";
import type Decimal from "decimal.js";
import { service } from "~/services";
import { run } from "~/components/cart/run";
import { type Extra, type Line } from "~/components/cart/types";
import { linesSubtotal } from "~/lib/purchase";
import { Extras } from "./z-Extras";
import { Listing } from "./z-Listing";
import { Payment } from "./z-Payment";
import { Tabs } from "./z-Tabs";
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
  onStage,
  grand,
  lines,
  onLines,
  issues,
  extras,
  onExtras,
  focusSearch,
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
  onStage: (stage: Stage) => void;
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  issues: Map<string, LineIssue>;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
  focusSearch: number;
  focusRounding: number;
  focusLast: number;
  onFocusPay: () => void;
  onExitUp: () => void;
  onCredit: () => Promise<string | null>;
  creditDisabled: boolean;
}) {
  // Bumped by F2; the payment stage watches it to put the cursor on its first
  // amount, even when it is already the open stage.
  const [focusPayment, setFocusPayment] = useState(0);

  // The open purchase takes its name from its first listing.
  useEffect(() => {
    const title = lines.find((line) => line.name.trim() !== "")?.name.trim() ?? "Transaksi Baru";
    if (title !== draft.title) {
      run(service.transaction.set.title(draft.id, title));
    }
  }, [lines, draft.id, draft.title]);

  // F2 settles the purchase from anywhere; F1 is handled by the page because
  // it has to reach the search bar of whichever grid is on screen.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        onStage("payment");
        setFocusPayment((count) => count + 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStage]);

  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden">
      <Tabs drafts={drafts} activeId={draft.id} onSelect={onSelect} />
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
        extras={extras}
        subtotal={linesSubtotal(lines)}
        onChange={onExtras}
        focusSearch={focusSearch}
      />
    );
  }
  return (
    <Payment
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
