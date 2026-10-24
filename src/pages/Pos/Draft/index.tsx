import { type Extra, type ExtraPreset, type Line } from "~/components/cart/types";
import { extrasTotal, linesSubtotal } from "~/lib/purchase";
import { Extras } from "~/components/cart/z-Extras";
import { Listing } from "~/components/cart/z-Listing";
import { CartPanel, Tabs } from "~/components/cart/z-Tabs";
import type { Draft as DraftModel } from "~/services/transaction";
import type { LineIssue } from "~/components/cart/code-issues";

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
  presets,
  loading,
}: {
  /** `null` while the drafts are still being read: the strip and both stages are drawn anyway. */
  draft: DraftModel | null;
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
  /** The extras catalog, from the page's registry — it loads beside the drafts. */
  presets: ExtraPreset[];
  /** The drafts are still being read: the strip and the rows hold their places. */
  loading: boolean;
}) {
  return (
    <section className="m-1 flex flex-1 flex-col overflow-hidden">
      <Tabs
        mode="sale"
        drafts={drafts}
        activeId={draft?.id ?? ""}
        onSelect={onSelect}
        loading={loading}
      />
      <CartPanel draftId={draft?.id}>
        <StageBody
          stage={stage}
          rounding={draft?.rounding ?? 0}
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
          presets={presets}
          loading={loading}
          onToggle={() => onStage(stage === "listing" ? "extra" : "listing")}
        />
      </CartPanel>
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
  presets,
  loading,
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
  presets: ExtraPreset[];
  loading: boolean;
  onToggle: () => void;
}) {
  const subtotal = linesSubtotal(lines);
  if (stage === "listing") {
    return (
      <Listing
        mode="sale"
        lines={lines}
        loading={loading}
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
      mode="sale"
      extras={extras}
      subtotal={linesSubtotal(lines)}
      rounding={rounding}
      presets={presets}
      loading={loading}
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