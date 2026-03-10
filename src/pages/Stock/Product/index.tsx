import { Result } from "~/lib/result";
import { useData } from "./use-data";
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
      <div className="flex-1 overflow-hidden">
        <div className="flex max-h-full overflow-hidden">
          <Table className="text-normal flex-1">
            <TableHeader />
            <Loader />
          </Table>
        </div>
      </div>
    </>
  );
}

export function Loader() {
  const res = useData();
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
