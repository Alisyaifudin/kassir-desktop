import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PAGE_SIZES, type ListStatePatch } from "./use-list-state";

export function ListFooter({
  page,
  size,
  total,
  set,
}: {
  page: number;
  size: number;
  total: number;
  set: (patch: ListStatePatch) => void;
}) {
  const totalPage = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);

  return (
    <div className="flex items-center justify-between gap-3 border-t bg-background px-4 py-2">
      <span className="text-normal tabular-nums text-muted-foreground">
        {from}–{to} dari {total}
      </span>
      <div className="flex items-center gap-3">
        <select
          value={size}
          onChange={(e) => set({ size: Number(e.currentTarget.value) })}
          className="h-8 rounded-md border bg-transparent px-2 text-normal outline-none"
          aria-label="Jumlah per halaman"
        >
          {PAGE_SIZES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={page <= 1}
            onClick={() => set({ page: page - 1 })}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-12 text-center text-normal tabular-nums">
            {page}/{totalPage}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={page >= totalPage}
            onClick={() => set({ page: page + 1 })}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
