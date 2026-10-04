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
  return (
    <div className="flex items-center gap-1">
      <Select value={state.sort} onValueChange={(value) => set({ sort: value as SortBy })}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_LABELS) as SortBy[]).map((value) => (
            <SelectItem key={value} value={value}>
              {SORT_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Ubah arah urutan"
        onClick={() => set({ dir: state.dir === "asc" ? "desc" : "asc" })}
      >
        {state.dir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
      </Button>
    </div>
  );
}
