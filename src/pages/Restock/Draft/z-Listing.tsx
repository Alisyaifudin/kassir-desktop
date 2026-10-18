import { useMemo } from "react";
import { AnimatePresence, Reorder } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { generateId } from "~/lib/random";
import type { Line } from "../mock";
import { ListingCard } from "./z-ListingCard";

/** A blank line for +manual. No `base`, so there is nothing to undo to. */
function blankLine(): Line {
  return {
    id: generateId(),
    name: "",
    code: "",
    unit: 0,
    price: 0,
    qty: 0,
    discount: 0,
  };
}

/**
 * Stage one: choosing what is being bought. The search bar and `+manual` stay
 * pinned to the top; the lines below scroll, newest on top and numbered from
 * the bottom, so the count only ever grows upwards.
 *
 * Listings are still mocked — the rows live in the panel's state and nothing is
 * written to `tx_listings` yet.
 */
export function Listing({ lines, onChange }: { lines: Line[]; onChange: (lines: Line[]) => void }) {
  const byId = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);
  const ids = lines.map((line) => line.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-12 border-b">
        <div className="col-span-10 p-1">
          <Input
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            type="search"
            placeholder="Cari barang untuk dibeli..."
            aria-autocomplete="list"
          />
        </div>
        <div className="col-span-2 border-l p-1">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onChange([blankLine(), ...lines])}
          >
            <Plus className="icon" />
            Manual
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
        <Reorder.Group
          axis="y"
          values={ids}
          onReorder={(next) =>
            onChange(next.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])))
          }
          className="divide-y divide-border"
        >
          <AnimatePresence initial={false}>
            {lines.map((line, index) => (
              <ListingCard
                key={line.id}
                line={line}
                number={lines.length - index}
                onChange={(patch) =>
                  onChange(lines.map((row) => (row.id === line.id ? { ...row, ...patch } : row)))
                }
                onRemove={() => onChange(lines.filter((row) => row.id !== line.id))}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  );
}
