import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { ForEach } from "~/components/ForEach";
import { Loader } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { useMethodFilter } from "../use-method";
import { MethodErrorBoundary, MethodErrorFallback } from "../z-Error";
import { FilterGroup } from "./z-FilterGroup";

export function Filter() {
  const filter = useMethodFilter();
  return (
    <MethodErrorBoundary fallback={MethodErrorFallback}>
      <Loader res={filter.res} fallback={<Loading />}>
        {() => <Wrapper filter={filter} />}
      </Loader>
    </MethodErrorBoundary>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-[96px] rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

function Wrapper({ filter }: { filter: ReturnType<typeof useMethodFilter> }) {
  const { groups, activeCount, kindState, subChecked, toggleKind, toggleSub, clear } = filter;

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant={activeCount > 0 ? "default" : "outline"}
            className={cn(
              "gap-2 rounded-xl transition-all duration-300 h-10 px-4",
              activeCount > 0
                ? "shadow-lg shadow-primary/20 border-primary/50 text-primary-foreground"
                : "hover:border-primary/50",
            )}
          >
            <SlidersHorizontal className="size-5 [--icon-stroke:2.5]" />
            <span className="font-semibold">Filter</span>
            {activeCount > 0 ? (
              <span className="rounded-full bg-background/25 px-1.5 text-sm tabular-nums">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </DialogTrigger>
        {activeCount > 0 ? (
          <Button
            size="icon"
            variant="secondary"
            onClick={clear}
            className="rounded-xl h-10 w-10 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
            aria-label="Hapus filter"
            title="Hapus filter"
          >
            <X className="size-5" />
          </Button>
        ) : null}

        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black tracking-tight">
                Kategori Pembayaran
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="px-6">
            Pilih satu atau lebih. Kosongkan untuk menampilkan semua.
          </DialogDescription>
          <div className="flex flex-col gap-4 p-6 pt-2 max-h-[70vh] overflow-y-auto">
            <ForEach items={groups}>
              {(group) => (
                <FilterGroup
                  key={group.base.id}
                  group={group}
                  state={kindState(group)}
                  subChecked={(sub) => subChecked(group, sub)}
                  onToggleKind={() => toggleKind(group)}
                  onToggleSub={(sub) => toggleSub(group, sub)}
                />
              )}
            </ForEach>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
