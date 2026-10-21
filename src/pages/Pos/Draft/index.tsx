import { useEffect } from "react";
import { Effect } from "effect";
import { service } from "~/services";
import { type Extra, type Line } from "../mock";
import { extrasTotal, linesSubtotal } from "~/lib/purchase";
import { Extras } from "./z-Extras";
import { Listing } from "./z-Listing";
import { Tabs } from "./z-Tabs";
import type { Draft as DraftModel } from "~/services/transaction";
import type { LineIssue } from "~/pages/_cart/code-issues";

/**
 * The stages the panel walks through, in order: choose the goods, then the
 * charges on the sale as a whole. The payment lives in the bottom panel, so it
 * never takes a stage of its own — see z-Bottom.tsx.
 */
export const STAGES = ["listing", "extra"] as const;

export type Stage = (typeof STAGES)[number];

/**
 * The sale being assembled: which draft is open, and which stage of building it
 * is showing. What it costs and what has been paid live in the bottom panel —
 * see page.tsx.
 */
export function Draft({
  draft,
  drafts,
  onSelect,
  stage,
  onStage,
  focusSearch,
  focusLast,
  onExitDown,
  focused,
  onActivate,
  lines,
  onLines,
  issues,
  extras,
  onExtras,
}: {
  draft: DraftModel;
  drafts: DraftModel[];
  onSelect: (id: string) => void;
  stage: Stage;
  onStage: (stage: Stage) => void;
  focusSearch: number;
  focusLast: number;
  onExitDown: () => void;
  focused: boolean;
  onActivate: () => void;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  issues: Map<string, LineIssue>;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
}) {
  // The open sale takes its name from its first listing.
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
        rounding={draft.rounding}
        focusSearch={focusSearch}
        focusLast={focusLast}
        onExitDown={onExitDown}
        focused={focused}
        onActivate={onActivate}
        lines={lines}
        onLines={onLines}
        issues={issues}
        extras={extras}
        onExtras={onExtras}
        onToggle={() => onStage(stage === "listing" ? "extra" : "listing")}
      />
    </section>
  );
}

function StageBody({
  stage,
  rounding,
  focusSearch,
  focusLast,
  onExitDown,
  focused,
  onActivate,
  lines,
  onLines,
  issues,
  extras,
  onExtras,
  onToggle,
}: {
  stage: Stage;
  rounding: number;
  focusSearch: number;
  focusLast: number;
  onExitDown: () => void;
  focused: boolean;
  onActivate: () => void;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  issues: Map<string, LineIssue>;
  extras: Extra[];
  onExtras: (extras: Extra[]) => void;
  onToggle: () => void;
}) {
  const subtotal = linesSubtotal(lines);
  if (stage === "listing") {
    return (
      <Listing
        lines={lines}
        issues={issues}
        extraTotal={extras.length === 0 ? null : extrasTotal(extras, subtotal)}
        onChange={onLines}
        onToggle={onToggle}
        focusSearch={focusSearch}
        focusLast={focusLast}
        onExitDown={onExitDown}
        focused={focused}
        onActivate={onActivate}
      />
    );
  }
  return (
    <Extras
      extras={extras}
      subtotal={linesSubtotal(lines)}
      rounding={rounding}
      onChange={onExtras}
      onToggle={onToggle}
      focusSearch={focusSearch}
      focusLast={focusLast}
      onExitDown={onExitDown}
      focused={focused}
      onActivate={onActivate}
    />
  );
}