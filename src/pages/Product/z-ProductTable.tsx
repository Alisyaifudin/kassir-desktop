import { Link } from "~/services/route/react";
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

export function ProductTable({ items, start }: { items: Product[]; start: number }) {
  return (
    // The scroll box, not the table, is what the padding lands on: the add
    // button floats 64–112 px above the foot of the page, so without this the
    // last row's open-link sat underneath it at the very bottom of the list.
    <Table className="text-base" parentClass="pb-16">
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
        <Button asChild variant="ghost" className="size-11">
          <Link
            // A step: the detail is opened from this list, so `Back` returns to it
            // on the filters it was left on.
            to={`/products/${product.id}`}
            behavior="push"
            aria-label={`Buka ${product.name}`}
          >
            <SquareArrowOutUpRight className="size-5" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
