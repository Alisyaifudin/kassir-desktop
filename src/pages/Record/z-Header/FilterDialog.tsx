import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { ForEach } from "~/components/ForEach";
import { Loader } from "~/components/Loader";
import { Show } from "~/components/Show";
import { Skeleton } from "~/components/ui/skeleton";
import { METHODS, METHOD_NAMES } from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { Method } from "~/services/method";
import { useMethod, useMethods } from "../use-method";
import { MethodErrorBoundary, MethodErrorFallback } from "../z-Error";
import { FilterBtn } from "./FilterBtn";

export function Filter() {
  const res = useMethods();
  return (
    <MethodErrorBoundary fallback={MethodErrorFallback}>
      <Loader res={res} fallback={<Loading />}>
        {({ data: methods }) => <Wrapper methods={methods} />}
      </Loader>
    </MethodErrorBoundary>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-10 w-[140px] rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

function Wrapper({ methods }: { methods: Method[] }) {
  const [method, setMethod] = useMethod();
  const group = groupMethods(methods);

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant={method ? "default" : "outline"}
            className={cn(
              "gap-2 rounded-xl transition-all duration-300 h-12 px-4",
              method
                ? "shadow-lg shadow-primary/20 border-primary/50 text-primary-foreground"
                : "hover:border-primary/50",
            )}
          >
            <SlidersHorizontal size={16} strokeWidth={2.5} />
            <Show value={method} fallback={<span className="font-semibold">Filter</span>}>
              {(selected) => (
                <span className="font-bold">
                  {selected.name
                    ? `${METHOD_NAMES[selected.kind]} ${selected.name}`
                    : METHOD_NAMES[selected.kind]}
                </span>
              )}
            </Show>
          </Button>
        </DialogTrigger>
        {method !== null && (
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setMethod(null)}
            className="rounded-xl h-10 w-10 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
            title="Clear Filter"
          >
            <X size={18} />
          </Button>
        )}

        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-big font-black tracking-tight">
                Kategori Pembayaran
              </DialogTitle>
            </div>
            <p className="text-normal text-muted-foreground font-medium mt-1">
              Pilih metode pembayaran untuk menyaring data.
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-6 pt-2 max-h-[70vh] overflow-y-auto">
            <ForEach items={group}>
              {({ top, options }) => (
                <FilterBtn
                  key={top.id}
                  selected={method?.id ?? null}
                  onClick={setMethod}
                  options={options}
                  top={top}
                />
              )}
            </ForEach>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Group = { top: Method; options: Method[] };

/** The base method has no name; every named method under a kind is a variant. */
function isBase(method: Method): boolean {
  return method.name === null || method.name === "";
}

/**
 * One group per built-in kind, in the canonical order. A kind with no base row
 * is skipped rather than throwing, so a partial catalog still renders.
 */
function groupMethods(methods: Method[]): Group[] {
  return METHODS.map((kind) => {
    const top = methods.find((method) => method.kind === kind && isBase(method));
    if (top === undefined) return null;
    return { top, options: methods.filter((method) => method.kind === kind && !isBase(method)) };
  }).filter((group): group is Group => group !== null);
}
