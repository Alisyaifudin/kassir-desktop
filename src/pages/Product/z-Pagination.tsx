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
import { pageData } from "./data";
import { filterProducts } from "./use-filtered";
import { PAGE_SIZES, type ListState, type ListStatePatch } from "./use-list-state";

/**
 * The foot of the list. It reads the catalog itself — the count is the only data
 * here — and holds its bar while that read is in flight, so the pagination
 * controls are where they will be before the first page arrives.
 */
export function ListFooter({
  state,
  set,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  return (
    <pageData.Gate
      keys={["products"]}
      // The bar's controls are already on screen from the frame; only its numbers
      // wait, so there is nothing to hold back.
      delay={0}
      pulse={<FooterBar total={null} page={1} size={state.size} set={set} />}
      error={null}
    >
      {({ products }) => {
        const total = filterProducts(products, state).length;
        const totalPage = Math.max(1, Math.ceil(total / state.size));
        return (
          <FooterBar
            total={total}
            page={Math.min(state.page, totalPage)}
            size={state.size}
            set={set}
          />
        );
      }}
    </pageData.Gate>
  );
}

/**
 * The bar itself. `total: null` is "not answered yet": the range and the page
 * count pulse, the select and the arrows stay put and disabled.
 */
function FooterBar({
  page,
  size,
  total,
  set,
}: {
  page: number;
  size: number;
  total: number | null;
  set: (patch: ListStatePatch) => void;
}) {
  const totalPage = total === null ? 1 : Math.max(1, Math.ceil(total / size));
  const from = total === null || total === 0 ? 0 : (page - 1) * size + 1;
  const to = total === null ? 0 : Math.min(total, page * size);
  const unknown = total === null;

  return (
    <div className="flex items-center justify-between gap-3 border-t bg-background px-4 py-2">
      <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
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
          <SelectTrigger className="h-11 w-[120px] text-sm">
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
            className="size-11"
            disabled={unknown || page <= 1}
            onClick={() => set({ page: page - 1 })}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="flex min-w-12 items-center justify-center text-sm tabular-nums">
            {unknown ? <SkeletonText className="w-8" /> : `${page}/${totalPage}`}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="size-11"
            disabled={unknown || page >= totalPage}
            onClick={() => set({ page: page + 1 })}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
