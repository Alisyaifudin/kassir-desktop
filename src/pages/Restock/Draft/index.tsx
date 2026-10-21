import { useEffect, useState } from "react";
import { Effect } from "effect";
import type Decimal from "decimal.js";
import { service } from "~/services";
import { type Extra, type Line } from "../mock";
import { linesSubtotal } from "~/lib/purchase";
import { Extras } from "./z-Extras";
import { Listing } from "./z-Listing";
import { Payment } from "./z-Payment";
import { Tabs } from "./z-Tabs";
import type { Draft as DraftModel } from "~/services/transaction";

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
  extras,
  onExtras,
}: {
  draft: DraftModel;
  drafts: DraftModel[];
  onSelect: (id: string) => void;
  stage: Stage;
  onStage: (stage: Stage) => void;
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
}) {
  // Bumped by F2; the payment stage watches it to put the cursor on its first
  // amount, even when it is already the open stage.
  const [focusPayment, setFocusPayment] = useState(0);
  // Bumped by F1 from the payment stage; the listing grid watches it to focus
  // its search bar.
  const [focusSearch, setFocusSearch] = useState(0);

  // The open purchase takes its name from its first listing.
  useEffect(() => {
    const title = lines.find((line) => line.name.trim() !== "")?.name.trim() ?? "Transaksi Baru";
    if (title !== draft.title) {
      void Effect.runFork(service.transaction.set.title(draft.id, title));
    }
  }, [lines, draft.id, draft.title]);

  // The function keys cross stages: F2 settles the purchase, and F1 from the
  // payment stage goes back to the goods and asks for the search bar.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        onStage("payment");
        setFocusPayment((count) => count + 1);
        return;
      }
      if (event.key === "F1" && stage === "payment") {
        event.preventDefault();
        onStage("listing");
        setFocusSearch((count) => count + 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStage, stage]);

  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden">
      <Tabs drafts={drafts} activeId={draft.id} onSelect={onSelect} />
      <StageBody
        stage={stage}
        draft={draft}
        grand={grand}
        lines={lines}
        onLines={onLines}
        extras={extras}
        onExtras={onExtras}
        focusPayment={focusPayment}
        focusSearch={focusSearch}
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
  extras,
  onExtras,
  focusPayment,
  focusSearch,
}: {
  stage: Stage;
  draft: DraftModel;
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
  focusPayment: number;
  focusSearch: number;
}) {
  if (stage === "listing") return <Listing lines={lines} onChange={onLines} focusSearch={focusSearch} />;
  if (stage === "extras") {
    return <Extras extras={extras} subtotal={linesSubtotal(lines)} onChange={onExtras} />;
  }
  return <Payment draft={draft} grand={grand} focusPayment={focusPayment} />;
}
