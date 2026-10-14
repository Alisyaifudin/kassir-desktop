import { Product } from "~/database/product/cache";
import { cn } from "~/lib/utils";
import { GRID_COLUMN_CLASS, useGridColumns } from "~/hooks/use-grid-columns";
import { useInterval } from "../use-interval";
import { useFilterProducts } from "./use-filter-products";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { ProductCard } from "./z-ProductCard";

type Props = {
  all: Product[];
};

export function ProductList({ all }: Props) {
  const urlBack = useGenerateUrlBack("/stock");
  const products = useFilterProducts(all);
  const { start, end } = useInterval(products.length);
  const columns = useGridColumns();
  return (
    <ul className={cn("grid gap-1.5 p-1", GRID_COLUMN_CLASS[columns])}>
      {products.slice(start, end).map((product) => (
        <ProductCard key={product.id} product={product} urlBack={urlBack} />
      ))}
    </ul>
  );
}
