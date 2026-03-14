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
import { FilterBtn } from "./FilterBtn";
import { Show } from "~/components/Show";
import { MethodFull } from "~/database/method/get-all";
import { TextError } from "~/components/TextError";
import { useGetMethods } from "~/hooks/use-get-methods";
import { Result } from "~/lib/result";
import { Loading } from "~/components/Loading";
import { log } from "~/lib/log";
import { DEFAULT_METHODS, METHOD_NAMES } from "~/lib/constants";
import { setMethods, useMethod, useMethods } from "../use-method";
import { cn } from "~/lib/utils";

export function Filter() {
  const res = useGetMethods((methods) => {
    const combined = [...methods, ...DEFAULT_METHODS];
    setMethods(combined);
  });
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError(error) {
      log.error(error.e);
      return <TextError>{error.e.message}</TextError>;
    },
    onSuccess() {
      return <Wrapper />;
    },
  });
}

function Wrapper() {
  const [method, setMethod] = useMethod();
  const methods = useMethods();
  const handleClick = (id: number) => {
    setMethod(id);
  };
  const handleClear = () => {
    setMethod(null);
  };
  const group = groupMethods(methods);

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant={method ? "default" : "outline"}
            className={cn(
              "gap-2 rounded-xl transition-all duration-300 h-10 px-4",
              method
                ? "shadow-lg shadow-primary/20 border-primary/50 text-primary-foreground"
                : "hover:border-primary/50",
            )}
          >
            <SlidersHorizontal size={16} strokeWidth={2.5} />
            <Show value={method} fallback={<span className="font-semibold">Filter</span>}>
              {(v) => (
                <span className="max-w-[150px] truncate font-bold">
                  {v.name ? `${METHOD_NAMES[v.kind]} ${v.name}` : METHOD_NAMES[v.kind]}
                </span>
              )}
            </Show>
          </Button>
        </DialogTrigger>
        {method !== null && (
          <Button
            size="icon"
            variant="secondary"
            onClick={handleClear}
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
                  onClick={handleClick}
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

function groupMethods(methods: MethodFull[]): { top: MethodFull; options: MethodFull[] }[] {
  return [
    filterMethod("cash", methods),
    filterMethod("transfer", methods),
    filterMethod("debit", methods),
    filterMethod("qris", methods),
  ];
}
function filterMethod(name: DB.MethodEnum, methods: MethodFull[]) {
  const top = methods.find((m) => m.kind === name && m.name === undefined);
  if (top === undefined) throw new Error("No " + name);
  const options = methods.filter((m) => m.kind === name && m.name !== undefined);
  return { top, options };
}
