import { Link } from "react-router";
import { SquareArrowOutUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { Product } from "~/services/product";
import { isLoss } from "./use-filtered";
import { ListingCodes, formatPrice, priceRange, StockBadge } from "./z-ProductBits";

export function ProductTable({
  items,
  start,
  urlBack,
}: {
  items: Product[];
  start: number;
  urlBack: string;
}) {
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-right">Harga</TableHead>
          <TableHead className="text-right">Modal</TableHead>
          <TableHead className="text-right">Stok</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((product, index) => (
          <ProductRow key={product.id} product={product} index={start + index} urlBack={urlBack} />
        ))}
      </TableBody>
    </Table>
  );
}

function ProductRow({
  product,
  index,
  urlBack,
}: {
  product: Product;
  index: number;
  urlBack: string;
}) {
  return (
    <TableRow className={cn(isLoss(product) && "bg-destructive/5")}>
      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{product.name}</span>
          <ListingCodes product={product} />
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{priceRange(product)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPrice(product.capital)}</TableCell>
      <TableCell className="text-right">
        <StockBadge product={product} />
      </TableCell>
      <TableCell>
        <Button asChild variant="ghost" className="size-11 small:size-9">
          <Link
            to={{
              pathname: `/products/${product.id}`,
              search: `url_back=${encodeURIComponent(urlBack)}`,
            }}
            aria-label={`Buka ${product.name}`}
          >
            <SquareArrowOutUpRight className="icon" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
