import { LINES } from "../mock";
import { Line } from "./z-Line";
import { Search } from "./z-Search";

/**
 * Stage one: choosing what is being bought. Search adds catalog goods; each
 * line stays editable because a restock line is entered from the invoice, not
 * trusted to the catalog.
 */
export function Listing() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 scroll-gutter">
      <Search />
      <div className="flex flex-col gap-2">
        {LINES.map((line, i) => (
          <Line key={line.id} line={line} index={i} />
        ))}
      </div>
    </div>
  );
}
