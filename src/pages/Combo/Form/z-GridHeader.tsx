import { useEffect, type KeyboardEvent, type RefObject } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kdb";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { cn } from "~/lib/utils";

export function GridHeader({
  input,
  searchRef,
  placeholder,
  nextLabel,
  compactLabel,
  nextCount,
  direction,
  searchSelected,
  toggleSelected,
  onSearchChange,
  onSearchKeyDown,
  onSelectSearch,
  onToggle,
  onSelectToggle,
}: {
  input: string;
  searchRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  nextLabel: string;
  compactLabel: string;
  nextCount: number;
  direction: "left" | "right";
  searchSelected: boolean;
  toggleSelected: boolean;
  onSearchChange: (value: string) => void;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelectSearch: () => void;
  onToggle: () => void;
  onSelectToggle: () => void;
}) {
  useEffect(() => {
    function focusSearch(event: globalThis.KeyboardEvent) {
      if (event.key !== "F1" || event.defaultPrevented || isScreenOwnedByDialog()) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [searchRef]);

  return (
    <div role="row" className="grid shrink-0 grid-cols-12 border-b">
      <div
        id="cell-header-search"
        role="gridcell"
        aria-selected={searchSelected}
        onClick={onSelectSearch}
        className={cn(
          "col-span-10 flex min-w-0 items-center gap-2 px-2",
          searchSelected && "ring-1 ring-inset ring-primary bg-muted",
        )}
      >
        <Kbd>F1</Kbd>
        <Input
          ref={searchRef}
          type="search"
          autoFocus
          value={input}
          onClick={onSelectSearch}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          onKeyDown={onSearchKeyDown}
          placeholder={placeholder}
          aria-keyshortcuts="F1"
          className="min-w-0 flex-1 border-0 bg-transparent shadow-none placeholder:italic focus-visible:ring-0"
        />
      </div>
      <div
        id="cell-header-toggle"
        role="gridcell"
        aria-selected={toggleSelected}
        onClick={onSelectToggle}
        className={cn("col-span-2 border-l p-0", toggleSelected && "ring-1 ring-inset ring-primary bg-muted")}
      >
        <Button
          type="button"
          variant="ghost"
          className="flex h-full min-h-11 w-full flex-col items-center justify-center gap-0 rounded-none px-1 md:items-start md:px-2"
          aria-label={`Buka tahap ${nextLabel}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelectToggle();
            onToggle();
          }}
        >
          <span className="flex items-center gap-1 text-sm md:text-base">
            {direction === "left" ? <ArrowLeft className="size-4 shrink-0 md:size-5" /> : null}
            <span className="hidden truncate md:inline">{nextLabel}</span>
            <span className="truncate md:hidden">{compactLabel}</span>
            {direction === "right" ? <ArrowRight className="size-4 shrink-0 md:size-5" /> : null}
          </span>
          <span className="hidden text-xs text-muted-foreground md:block">{nextCount} dipilih</span>
        </Button>
      </div>
    </div>
  );
}
