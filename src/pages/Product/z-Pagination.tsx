import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
      <span className="text-small tabular-nums text-muted-foreground">
        {from}–{to} dari {total}
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
            disabled={page <= 1}
            onClick={() => set({ page: page - 1 })}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="icon" />
          </Button>
          <span className="min-w-12 text-center text-small tabular-nums">
            {page}/{totalPage}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="size-11 small:size-9"
            disabled={page >= totalPage}
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
