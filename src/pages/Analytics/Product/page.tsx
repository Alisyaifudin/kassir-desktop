import { useData } from "./use-data";
import { NavList } from "../z-NavList";
import { Summary } from "./z-Summary";
import { ProductList } from "./z-ProductList";
import { Panel } from "./z-Panel";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { SearchInput } from "./z-SearchInput";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export default function Page() {
  return (
    <>
      <NavList selected="products">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 flex-1 overflow-hidden">
        <Panel />
        <SearchInput />
        <Wrapper />
      </div>
    </>
  );
}

function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingTable />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(items) {
      return <ProductList items={items} />;
    },
  });
}

function LoadingTable() {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <Table className="text-normal">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">No</TableHead>
              <TableHead className="w-[219px] small:w-[150px]">Barcode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="text-end w-[120px] small:w-[90px]">Harga</TableHead>
              <TableHead className="text-end w-[120px] small:w-[90px]">Modal</TableHead>
              <TableHead className="w-[57px] small:w-[40px]">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-64" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
