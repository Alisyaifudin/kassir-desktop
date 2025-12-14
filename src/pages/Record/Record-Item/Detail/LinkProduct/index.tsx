import { ExternalLink, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollable,
} from "~/components/ui/table";
import { TextError } from "~/components/TextError";
import { useLinkProduct } from "./use-link-product";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { cn, Result, sizeClass } from "~/lib/utils";
import { use } from "react";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "../../action";
import { Size } from "~/lib/store-old";

export function LinkProductList({
  item,
  size,
  products: promise,
}: {
  item: DB.RecordItem;
  size: Size;
  products: Promise<Result<"Aplikasi bermasalah", DB.Product[]>>;
}) {
  const [errMsg, products] = use(promise);
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  return <LinkProduct size={size} item={item} products={products} />;
}

export function LinkProduct({
  item,
  products,
  size,
}: {
  item: DB.RecordItem;
  products: DB.Product[];
  size: Size;
}) {
  const { handleChange, handleClick, query, shownProducts, selected } = useLinkProduct(
    item,
    products,
  );
  const loading = useLoading();
  const error = useAction<Action>()("link-product");
  return (
    <Dialog>
      <Button variant="ghost" size="icon" asChild>
        <DialogTrigger>
          {item.product_id ? <Lock className="icon" /> : <ExternalLink className="icon" />}
        </DialogTrigger>
      </Button>
      <DialogContent
        className={cn(
          "left-5 top-5 bottom-5 right-5 w-[calc(100%-40px)] max-w-full translate-0 flex flex-col gap-2",
          sizeClass[size],
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-normal">Hubungkan dengan produk</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col p-2 gap-2">
          <div className="flex items-center gap-5">
            <p className="">Barang:</p>
            <p>{item.name}</p>
            <p>Rp{item.price.toLocaleString("id-ID")}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="">Produk terhubung:</p>
            <TextError>{error?.productId}</TextError>
            <Show value={selected} fallback={<p>--Kosong--</p>}>
              {(selected) => (
                <div className="flex gap-5 items-center">
                  {selected.barcode === null || selected.barcode === "" ? null : (
                    <p>{selected.barcode}</p>
                  )}
                  <p>{selected.name}</p>
                  <p>Rp{selected.price.toLocaleString("id-ID")}</p>
                </div>
              )}
            </Show>
            <Spinner when={loading} />
          </div>
        </div>
        <Input
          type="search"
          placeholder="Cari.."
          value={query}
          onChange={handleChange}
          aria-autocomplete="list"
        />
        <TextError>{error?.global}</TextError>
        <TableScrollable>
          <TableHeader className="text-normal">
            <TableRow>
              <TableHead className="w-[70px]">No</TableHead>
              <TableHead className="w-[200px]">Barcode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="text-right">Harga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-auto text-normal">
            {shownProducts.slice(0, 20).map((product, i) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <Button
                    onClick={handleClick(item.id, product.id)}
                    className="w-full p-1"
                    variant={
                      selected !== undefined && selected.id === product.id ? "secondary" : "default"
                    }
                  >
                    {i + 1}
                  </Button>
                </TableCell>
                <TableCell>{product.barcode ?? ""}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell className="text-right">
                  {product.price.toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableScrollable>
      </DialogContent>
    </Dialog>
  );
}
