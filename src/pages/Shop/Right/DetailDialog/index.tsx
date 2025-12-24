import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Image } from "./Image";
import { db } from "~/database";
import { toast } from "sonner";
import { image } from "~/lib/image";
import { log } from "~/lib/utils";

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
  const [srcs, setSrcs] = useState<string[]>([]);
  useEffect(() => {
    async function download() {
      const [errMsg, res] = await db.image.get.byProductId(productId);
      if (errMsg) {
        toast.error("Gagal mencari gambar");
        log.error(`Failed to fetch image for ${productId} (${name})`);
        return;
      }
      const imgs = await Promise.all(res.map((r) => image.load(r.name, r.mime)));
      const urls: string[] = [];
      for (const [errMsg, img] of imgs) {
        if (errMsg) {
          log.error(`Failed to load image for ${productId} (${name})`);
          continue;
        }
        urls.push(img);
      }
      setSrcs(urls);
    }
    download();
  }, [productId]);
  if (srcs.length === 0) {
    return (
      <Popover>
        <PopoverTrigger type="button" className="flex items-center">
          <p className="text-center">{index + 1}</p>
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
}
