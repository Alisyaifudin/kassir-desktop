import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { SkeletonText } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PAGE_SIZES, type ListStatePatch } from "./use-list-state";

/**
 * The foot of the list. The page-size select and the arrows are static; the range
 * and the page count are data, so they pulse — the bar itself never moves and the
 * select is usable before the first page arrives.
 */
export function ListFooter({
  page,
  size,
  total,
  set,
}: {
  page: number;
  size: number;
  /** `null` while the catalog is loading. */
  total: number | null;
  set: (patch: ListStatePatch) => void;
}) {
  const totalPage = total === null ? 1 : Math.max(1, Math.ceil(total / size));
  const from = total === null || total === 0 ? 0 : (page - 1) * size + 1;
  const to = total === null ? 0 : Math.min(total, page * size);
  const unknown = total === null;

  return (
    <div className="flex items-center justify-between gap-3 border-t bg-background px-4 py-2">
      <span className="flex items-center gap-1 text-small tabular-nums text-muted-foreground">
        {unknown ? (
          <>
            <SkeletonText className="w-14" />
            <span>dari</span>
            <SkeletonText className="w-8" />
          </>
        ) : (
          `${from}–${to} dari ${total}`
        )}
      </span>
      <div className="flex items-center gap-3">
        <Select value={String(size)} onValueChange={(value) => set({ size: Number(value) })}>
          <SelectTrigger className="h-11 small:w-[100px] w-[120px] text-small small:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            className="size-11 small:size-9"
            disabled={unknown || page <= 1}
            onClick={() => set({ page: page - 1 })}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="icon" />
          </Button>
          <span className="flex min-w-12 items-center justify-center text-small tabular-nums">
            {unknown ? <SkeletonText className="w-8" /> : `${page}/${totalPage}`}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="size-11 small:size-9"
            disabled={unknown || page >= totalPage}
            onClick={() => set({ page: page + 1 })}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="icon" />
          </Button>
        </div>
      </div>
    </div>
  );
}
