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
import { isPublished, type Product } from "~/services/product";
import { isLoss } from "./use-filtered";
import {
  ListingCodes,
  formatPrice,
  priceRange,
  StockBadge,
  UnpublishedBadge,
} from "./z-ProductBits";

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
  // A withdrawn product is greyed out rather than hidden: `/products` is the
  // only screen that still lists it, so it is also the only place the state is
  // discoverable. The tint wins over the loss tint when a row is both.
  const published = isPublished(product);
  return (
    <TableRow
      className={cn(
        isLoss(product) && "bg-destructive/5",
        !published && "bg-muted/60 hover:bg-muted/60",
      )}
    >
      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", !published && "text-muted-foreground")}>
              {product.name}
            </span>
            {published ? null : <UnpublishedBadge />}
          </div>
          <ListingCodes product={product} />
        </div>
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", !published && "text-muted-foreground")}>
        {priceRange(product)}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", !published && "text-muted-foreground")}>
        {/* The dearest stocked lot, like the card's `Modal` line — the column and
            the card are the same fact, and a table that averaged while the card
            did not left the two views of one page disagreeing. */}
        {formatPrice(product.maxCapital)}
      </TableCell>
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
