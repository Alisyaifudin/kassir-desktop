import { SquareArrowOutUpRight } from "lucide-react";
import { TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { useInterval } from "../use-interval";
import { Product } from "~/database/product/caches";
import { cn, formatBarcode } from "~/lib/utils";
import { useFilterProducts } from "./use-filter-products";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

type Props = {
  all: Product[];
};

export function ProductList({ all }: Props) {
  const urlBack = useGenerateUrlBack("/stock");
  const products = useFilterProducts(all);
  const { start, end } = useInterval(products.length);
  return (
    <TableBody>
      {products.slice(start, end).map((product, i) => (
        <TableRow
          key={i}
          className={cn(
            { "bg-blue-50/50": i % 2 == 0 },
            { "bg-red-100": product.capital >= product.price },
          )}
        >
          <TableCell>{i + 1 + start}</TableCell>
          <TableCell>{formatBarcode(product.barcode)}</TableCell>
          <TableCell>{product.name}</TableCell>
          <TableCell className="text-right">{product.price.toLocaleString("id-ID")}</TableCell>
          <TableCell className="text-right">{product.capital.toLocaleString("id-ID")}</TableCell>
          <TableCell className="text-right">{product.stock}</TableCell>
          <TableCell>
            <Button variant="link" className="p-0 cursor-pointer">
              <Link
                to={{
                  pathname: `product/${product.id}`,
                  search: `?url_back=${encodeURIComponent(urlBack)}`,
                }}
              >
                <SquareArrowOutUpRight className="icon" />
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
