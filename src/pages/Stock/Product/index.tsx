import { Result } from "~/lib/result";
import { useGetProducts } from "../../../hooks/use-get-products";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { ProductPanel } from "./z-ProductPanel";
import { ProductList } from "./z-ProductList";
import { Table } from "~/components/ui/table";
import { TableHeader } from "./z-TableHeader";
import { Loading } from "./z-Loading";

export function ProductEntries() {
  return (
    <>
      <ProductPanel />
      <div className="flex-1 overflow-hidden min-h-0 w-full">
        <div className="flex flex-col h-full overflow-hidden">
          <Table className="text-normal">
            <TableHeader />
            <Loader />
          </Table>
        </div>
      </div>
    </>
  );
}

export function Loader() {
  const res = useGetProducts();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent status={500}>{e.message}</ErrorComponent>;
    },
    onSuccess(products) {
      return <ProductList all={products} />;
    },
  });
}
