import { EXTRAS } from "../mock";
import { mockSubtotal } from "../total";
import { Extras, Subtotal } from "./z-Extras";
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
}: {
  draft: DraftModel;
  drafts: DraftModel[];
  onSelect: (id: string) => void;
  stage: Stage;
  grand: number;
}) {
  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden">
      <Tabs drafts={drafts} activeId={draft.id} onSelect={onSelect} />
      <StageBody stage={stage} draft={draft} grand={grand} />
    </section>
  );
}

function StageBody({
  stage,
  draft,
  grand,
}: {
  stage: Stage;
  draft: DraftModel;
  grand: number;
}) {
  if (stage === "listing") return <Listing />;
  if (stage === "extras") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 scroll-gutter">
        <Subtotal subtotal={mockSubtotal()} />
        <Extras extras={EXTRAS} />
      </div>
    );
  }
  return <Payment draft={draft} grand={grand} />;
}
