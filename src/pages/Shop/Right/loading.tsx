import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { Header } from "./Header";

export function LoadingRight() {
  const size = useSize();
  return (
    <div className="border-r flex-1 flex flex-col m-1 gap-2">
      <div className="outline flex-1 p-1 flex flex-col gap-1">
        <div className="flex flex-col">
          <div className="flex gap-2 items-end justify-between ">
            <div className="flex items-center gap-1  self-stretch">
              <div className="flex items-center flex-1 gap-1 bg-white self-stretch px-0.5 pt-0.5 left-2 overflow-x-auto">
                <div>
                  <Button className="p-1 rounded-full">
                    <Plus className="icon" />
                  </Button>
                </div>
                <div
                  className={cn(
                    css.tab[size],
                    "rounded-b-0 animate-pulse bg-zinc-300 self-stretch rounded-t-md outline flex items-center gap-1"
                  )}
                />
                <div
                  className={cn(
                    css.tab[size],
                    "rounded-b-0 animate-pulse bg-zinc-300 self-stretch rounded-t-md outline flex items-center gap-1"
                  )}
                />
                <div
                  className={cn(
                    css.tab[size],
                    "rounded-b-0 animate-pulse bg-zinc-300 self-stretch rounded-t-md outline flex items-center gap-1"
                  )}
                />
              </div>
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-1">
                <Button className="animate-pulse" type="button">
                  Jual
                </Button>
                <Button className="animate-pulse" type="button">
                  Beli
                </Button>
              </div>
            </div>
          </div>
          <Header />
        </div>
        <div className="flex flex-1 gap-1 flex-col min-h-0 h-full">
          <div className={cn("w-full bg-zinc-200 animate-pulse", css.item[size].loading)}></div>
          <div className={cn("w-full bg-zinc-200 animate-pulse", css.item[size].loading)}></div>
          <div className={cn("w-full bg-zinc-200 animate-pulse", css.item[size].loading)}></div>
          <div className={cn("w-full bg-zinc-200 animate-pulse", css.item[size].loading)}></div>
        </div>
      </div>
      <div className={cn("flex flex-col pb-5", css.grandTotal[size].container)}>
        <p className="px-2 text-end">Kasir:</p>
        <div
          className={cn("text-center bg-zinc-200 animate-pulse", css.grandTotal[size].loading)}
        ></div>
      </div>
    </div>
  );
}
