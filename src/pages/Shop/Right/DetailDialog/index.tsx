import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Image } from "./Image";
import { TextError } from "~/components/TextError";
import { useImage } from "./use-image";
import { Result } from "~/lib/result";
import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import { Info } from "lucide-react";

export function DetailDialog({
  productId,
  stock,
  index,
  name,
}: {
  productId: number;
  stock: number;
  name: string;
  index: number;
}) {
  const res = useImage(productId);
  return Result.match(res, {
    onLoading() {
      return (
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/50 text-small font-medium text-muted-foreground">
          {index + 1}
        </div>
      );
    },
    onError(error) {
      return <TextError className="text-[10px]">{error}</TextError>;
    },
    onSuccess(srcs) {
      const trigger = (
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full relative">
          <span className="text-small">{index + 1}</span>
          <Info className="h-3 w-3 absolute -bottom-0.5 -right-0.5" />
        </Button>
      );

      if (srcs.length === 0) {
        return (
          <Popover>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent className="p-3 w-48">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Detail Produk
                </p>
                <div className="h-px bg-border my-0.5" />
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">ID</span>
                  <span className="text-sm font-mono font-medium">{productId}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Stok</span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      stock <= 0 ? "text-destructive" : "text-primary",
                    )}
                  >
                    {stock}
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      }
      return (
        <Dialog>
          <DialogTrigger asChild>{trigger}</DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-6 py-4">
              <div className="rounded-xl overflow-hidden border shadow-sm bg-muted/10">
                <Image srcs={srcs} />
              </div>
              <div className="flex items-center justify-center gap-12 p-4 rounded-lg bg-muted/30">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wide">
                    Product ID
                  </span>
                  <span className="text-2xl font-mono font-bold">{productId}</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wide">
                    Stok Tersedia
                  </span>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      stock <= 0 ? "text-destructive" : "text-primary",
                    )}
                  >
                    {stock}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    },
  });
}
