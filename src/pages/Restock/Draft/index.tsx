import { useEffect } from "react";
import { Effect } from "effect";
import type Decimal from "decimal.js";
import { service } from "~/services";
import { type Extra, type Line } from "../mock";
import { linesSubtotal } from "../total";
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
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
}) {
  // The open purchase takes its name from its first listing.
  useEffect(() => {
    const title = lines.find((line) => line.name.trim() !== "")?.name.trim() ?? "Transaksi Baru";
    if (title !== draft.title) {
      void Effect.runFork(service.transaction.set.title(draft.id, title));
    }
  }, [lines, draft.id, draft.title]);

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
}: {
  stage: Stage;
  draft: DraftModel;
  grand: Decimal;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
}) {
  if (stage === "listing") return <Listing lines={lines} onChange={onLines} />;
  if (stage === "extras") {
    return <Extras extras={extras} subtotal={linesSubtotal(lines)} onChange={onExtras} />;
  }
  return <Payment draft={draft} grand={grand} />;
}
