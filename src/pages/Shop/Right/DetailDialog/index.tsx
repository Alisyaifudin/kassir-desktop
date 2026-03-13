import { Lock } from "lucide-react";
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
      return <span className="text-center">{index + 1}</span>;
    },
    onError(error) {
      return <TextError>{error}</TextError>;
    },
    onSuccess(srcs) {
      if (srcs.length === 0) {
        return (
          <Popover>
            <PopoverTrigger type="button" className="flex items-center">
              <span className="text-center">{index + 1}</span>
              <Lock className="icon" />
            </PopoverTrigger>
            <PopoverContent className="flex flex-col text-2xl w-fit">
              <p>Id: {productId}</p>
              <p>Stok: {stock}</p>
            </PopoverContent>
          </Popover>
        );
      }
      return (
        <Dialog>
          <div className="flex items-center">
            <p className="text-center">{index + 1}</p>
            <DialogTrigger type="button">
              <Lock className="icon" />
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-normal">{name}</DialogTitle>
              <div className="max-h-[80vh] overflow-hidden">
                <Image srcs={srcs} />
              </div>
              <div className="flex items-center gap-5 text-3xl">
                <p>Id: {productId}</p>
                <p>Stok: {stock}</p>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    },
  });
}
