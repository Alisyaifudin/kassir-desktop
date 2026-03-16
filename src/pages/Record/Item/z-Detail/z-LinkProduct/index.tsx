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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { TextError } from "~/components/TextError";
import { useLinkProduct } from "./use-link-product";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { cn } from "~/lib/utils";
import { RecordData } from "../../use-data";
import { useProducts } from "~/hooks/use-get-products";
import { useChange } from "./use-change";

export function LinkProductList({ product }: { product: RecordData["products"][number] }) {
  const products = useProducts();
  const { handleClick, error, loading } = useLinkProduct(product);
  const { handleChange, query, selected, shownProducts } = useChange(product, products);
  if (products.length === 0) return null;
  return (
    <Dialog>
      <Button variant="ghost" size="icon" asChild>
        <DialogTrigger>
          {product.productId !== undefined ? (
            <Lock className="icon" />
          ) : (
            <ExternalLink className="icon" />
          )}
        </DialogTrigger>
      </Button>
      <DialogContent
        className={cn(
          "left-5 top-5 bottom-5 right-5 w-[calc(100%-40px)] max-w-full translate-0 flex flex-col gap-2",
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-normal">Hubungkan dengan produk</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col p-2 gap-2">
          <div className="flex items-center gap-5">
            <p className="">Barang:</p>
            <p>{product.name}</p>
            <p>Rp{product.price.toLocaleString("id-ID")}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="">Produk terhubung:</p>
            <Show value={selected} fallback={<p>--Kosong--</p>}>
              {(selected) => (
                <div className="flex gap-5 items-center">
                  {selected.barcode === undefined || selected.barcode === "" ? null : (
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
        <TextError>{error}</TextError>
        <Table>
          <TableHeader className="text-normal">
            <TableRow>
              <TableHead className="w-[70px]">No</TableHead>
              <TableHead className="w-[200px]">Barcode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="text-right">Harga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-auto text-normal">
            {shownProducts.slice(0, 20).map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Button
                    onClick={handleClick(p.id)}
                    className="w-full p-1"
                    variant={
                      selected !== undefined && selected.id === p.id ? "secondary" : "default"
                    }
                  >
                    {i + 1}
                  </Button>
                </TableCell>
                <TableCell>{p.barcode ?? ""}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-right">{p.price.toLocaleString("id-ID")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
