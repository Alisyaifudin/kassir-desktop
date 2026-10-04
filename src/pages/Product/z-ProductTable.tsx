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
import { KindChips, formatPrice, priceRange, StockBadge } from "./z-ProductBits";

export function ProductTable({ items, start }: { items: Product[]; start: number }) {
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
          <ProductRow key={product.id} product={product} index={start + index} />
        ))}
      </TableBody>
    </Table>
  );
}

function ProductRow({ product, index }: { product: Product; index: number }) {
  return (
    <TableRow className={cn(isLoss(product) && "bg-destructive/5")}>
      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{product.name}</span>
          <KindChips product={product} />
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{priceRange(product)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPrice(product.capital)}</TableCell>
      <TableCell className="text-right">
        <StockBadge product={product} />
      </TableCell>
      <TableCell>
        <Button asChild variant="ghost" size="icon">
          <Link to={`/products/${product.id}`} aria-label={`Buka ${product.name}`}>
            <SquareArrowOutUpRight className="size-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
