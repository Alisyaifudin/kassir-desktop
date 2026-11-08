import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type { ContentsFilter, ListState, ListStatePatch, StatusFilter } from "./use-list-state";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Semua",
  active: "Aktif",
  inactive: "Nonaktif",
};
const CONTENT_LABELS: Record<ContentsFilter, string> = {
  all: "Semua",
  listings: "Ada listing",
  extras: "Ada biaya/potongan",
};

export function Filter({ state, set }: { state: ListState; set: (patch: ListStatePatch) => void }) {
  const activeCount = Number(state.status !== "all") + Number(state.contents !== "all");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="gap-2 text-base">
          <SlidersHorizontal className="size-5" />
          Filter
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-sm text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Status</span>
          <RadioGroup
            value={state.status}
            onValueChange={(value) => set({ status: value as StatusFilter })}
            className="flex flex-col gap-2"
          >
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={value} /> {STATUS_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Isi combo</span>
          <RadioGroup
            value={state.contents}
            onValueChange={(value) => set({ contents: value as ContentsFilter })}
            className="flex flex-col gap-2"
          >
            {(Object.keys(CONTENT_LABELS) as ContentsFilter[]).map((value) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={value} /> {CONTENT_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-11 text-sm"
          disabled={activeCount === 0}
          onClick={() => set({ status: "all", contents: "all" })}
        >
          Reset filter
        </Button>
      </PopoverContent>
    </Popover>
  );
}
