import { Extras, Subtotal } from "./z-Extras";
import { Line } from "./z-Line";
import { Search } from "./z-Search";
import { DRAFT, TOTALS } from "../mock";

/**
 * Everything that makes up the draft, top to bottom: what was added in bulk,
 * the search box, then the lines themselves.
 *
 * Extras deliberately sit above the lines rather than mixed in with them —
 * they belong to the purchase, not to any one item, and mixing the two is what
 * makes a purchase screen hard to audit.
 */
export function Lines() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 scroll-gutter">
      <Extras extras={DRAFT.extras} />
      <Subtotal subtotal={TOTALS.subtotal} />
      <Search />
      <div className="flex flex-col gap-2">
        {DRAFT.lines.map((line, i) => (
          <Line key={line.id} line={line} index={i} />
        ))}
      </div>
    </div>
  );
}
