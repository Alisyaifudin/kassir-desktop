import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { ListState, ListStatePatch, SortBy } from "./use-list-state";

const SORT_LABELS: Record<SortBy, string> = {
  score: "Skor",
  name: "Nama",
  price: "Harga",
  capital: "Modal",
  stock: "Stok",
  updated: "Terbaru",
};

export function Sort({
  state,
  set,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  const hasQuery = state.q.trim() !== "";
  // `Skor` only exists while there is a query to score against.
  const options = (Object.keys(SORT_LABELS) as SortBy[]).filter(
    (value) => value !== "score" || hasQuery,
  );
  // Relevance is always highest-first, so the direction toggle does not apply.
  const showDirection = state.sort !== "score";

  return (
    <div className="flex items-center gap-1">
      <Select value={state.sort} onValueChange={(value) => set({ sort: value as SortBy })}>
        <SelectTrigger className="w-[170px] text-small small:h-10 small:w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((value) => (
            <SelectItem key={value} value={value}>
              {SORT_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showDirection ? (
        <Button
          type="button"
          variant="outline"
          aria-label="Ubah arah urutan"
          className="size-[54px] small:size-10"
          onClick={() => set({ dir: state.dir === "asc" ? "desc" : "asc" })}
        >
          {state.dir === "asc" ? <ArrowUp className="icon" /> : <ArrowDown className="icon" />}
        </Button>
      ) : null}
    </div>
  );
}
