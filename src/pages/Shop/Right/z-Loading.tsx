import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";

export function LoadingRight() {
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
                    "w-[60px] small:w-[50px]",
                    "rounded-b-0 animate-pulse bg-zinc-300 self-stretch rounded-t-md outline flex items-center gap-1",
                  )}
                />
                <div
                  className={cn(
                    "w-[60px] small:w-[50px]",
                    "rounded-b-0 animate-pulse bg-zinc-300 self-stretch rounded-t-md outline flex items-center gap-1",
                  )}
                />
                <div
                  className={cn(
                    "w-[60px] small:w-[50px]",
                    "rounded-b-0 animate-pulse bg-zinc-300 self-stretch rounded-t-md outline flex items-center gap-1",
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
          {/* <HeaderColumn /> */}
        </div>
        <div className="flex flex-1 gap-1 flex-col min-h-0 h-full">
          <div className={cn("w-full bg-zinc-200 animate-pulse", "w-[62px] small:w-[58px]")}></div>
          <div className={cn("w-full bg-zinc-200 animate-pulse", "w-[62px] small:w-[58px]")}></div>
          <div className={cn("w-full bg-zinc-200 animate-pulse", "w-[62px] small:w-[58px]")}></div>
          <div className={cn("w-full bg-zinc-200 animate-pulse", "w-[62px] small:w-[58px]")}></div>
        </div>
      </div>
      <div className={cn("flex flex-col pb-[36px] small:pb-[25px]")}>
        <p className="px-2 text-end">Kasir:</p>
        <div className={cn("text-center bg-zinc-200 animate-pulse h-[128px] small:h-[76px]")}></div>
      </div>
    </div>
  );
}
