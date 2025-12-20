import { ArrowDownNarrowWide, ArrowDownWideNarrow, SquareArrowOutUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { useInterval } from "./use-interval";
import { useSize } from "~/hooks/use-size";
import { Product } from "~/database/product/caches";
import { useCallback } from "react";
import { cn, formatBarcode } from "~/lib/utils";
import { useSortBy } from "./use-sort-by";
import { useSortDir } from "./use-sort-dir";

type Props = {
  products: Product[];
};

const width = {
  big: {
    no: {
      width: "50px",
    },
    code: {
      width: "160px",
    },
    price: {
      width: "100px",
    },
    stock: {
      width: "50px",
    },
    link: {
      width: "30px",
    },
  },
  small: {
    no: {
      width: "50px",
    },
    code: {
      width: "160px",
    },
    price: {
      width: "100px",
    },
    stock: {
      width: "50px",
    },
    link: {
      width: "30px",
    },
  },
};

export function ProductList({ products }: Props) {
  const { start, end } = useInterval(products.length);
  const size = useSize();
  const backURL = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  const [sortBy, setSortBy] = useSortBy();
  const [sortDir, setSortDir] = useSortDir();
  const handleSort = useCallback(
    (sort: "name" | "barcode" | "stock" | "price" | "capital") => () => {
      if (sort === sortBy) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
        return;
      }
      setSortBy(sort);
    },
    [sortDir, sortBy]
  );
  return (
    <Table className="text-normal flex-1">
      <TableHeader>
        <TableRow>
          <TableHead style={width[size].no}>No</TableHead>
          <TableHead style={width[size].code}>
            <SortBtn
              onClick={handleSort("barcode")}
              sort={sortBy === "barcode" ? sortDir : undefined}
              className="justify-center"
            >
              Kode
            </SortBtn>
          </TableHead>
          <TableHead>
            <SortBtn
              onClick={handleSort("name")}
              sort={sortBy === "name" ? sortDir : undefined}
              className="justify-center"
            >
              Nama
            </SortBtn>
          </TableHead>
          <TableHead style={width[size].price}>
            <SortBtn
              onClick={handleSort("price")}
              sort={sortBy === "price" ? sortDir : undefined}
              className="justify-end"
            >
              Harga
            </SortBtn>
          </TableHead>
          <TableHead style={width[size].price}>
            <SortBtn
              onClick={handleSort("capital")}
              sort={sortBy === "capital" ? sortDir : undefined}
              className="justify-end"
            >
              Modal
            </SortBtn>
          </TableHead>
          <TableHead style={width[size].stock}>
            <SortBtn
              onClick={handleSort("stock")}
              sort={sortBy === "stock" ? sortDir : undefined}
              className="justify-center"
            >
              Stok
            </SortBtn>
          </TableHead>
          <TableHead style={width[size].link}></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="overflow-auto flex-1 w-full">
        {products.slice(start, end).map((product, i) => (
          <TableRow key={i} className={cn({ "bg-red-100": product.capital >= product.price })}>
            <TableCell>{i + 1 + start}</TableCell>
            <TableCell>{formatBarcode(product.barcode)}</TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell className="text-right">{product.price.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-right">{product.capital.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-right">{product.stock}</TableCell>
            <TableCell>
              <Button variant="link" className="p-0 cursor-pointer">
                <Link to={{ pathname: `product/${product.id}`, search: `?url_back=${backURL}` }}>
                  <SquareArrowOutUpRight className="icon" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortBtn({
  children,
  sort,
  onClick,
  className,
}: {
  children: string;
  sort?: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  if (sort === undefined)
    return (
      <button
        onClick={onClick}
        className={cn("p-0 w-full h-full flex items-center hover:shadow-md", className)}
      >
        {children}
      </button>
    );
  return (
    <button
      onClick={onClick}
      className="p-0 w-full h-full flex items-center justify-between hover:shadow-md"
    >
      {children}
      {sort === "desc" ? <ArrowDownWideNarrow /> : <ArrowDownNarrowWide />}
    </button>
  );
}

