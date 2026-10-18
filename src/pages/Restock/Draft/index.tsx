import { DRAFT, TOTALS } from "../mock";
import { Extras, Subtotal } from "./z-Extras";
import { Listing } from "./z-Listing";
import { Payment } from "./z-Payment";
import { Tabs } from "./z-Tabs";

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
 *
 * The sale screen tints this whole region and stamps a "BELI" watermark on it,
 * because there one page served both directions. This page only ever buys, so
 * the watermark would be stating the obvious on every screen — dropped, and
 * the tint with it.
 */
export function Draft({ stage }: { stage: Stage }) {
  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden">
      <Tabs />
      <StageBody stage={stage} />
    </section>
  );
}

function StageBody({ stage }: { stage: Stage }) {
  if (stage === "listing") return <Listing />;
  if (stage === "extras") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 scroll-gutter">
        <Subtotal subtotal={TOTALS.subtotal} />
        <Extras extras={DRAFT.extras} />
      </div>
    );
  }
  return <Payment />;
}
