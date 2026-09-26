import { Layout } from "./z-Layout";
import { useGetProducts } from "~/hooks/use-get-products";
import { Result } from "~/lib/result";
import { Loading } from "./z-LoadingTable";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { ProductList } from "./z-ProductList";
import { ProductPanel } from "./z-ProductPanel";
import { Table } from "~/components/ui/table";
import { TableHeader } from "./z-TableHeader";

export default function Page() {
  return (
    <Layout className="flex flex-col gap-5 py-2 px-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <ProductPanel />
      <div className="flex-1 overflow-hidden min-h-0 w-full">
        <div className="flex flex-col h-full overflow-hidden">
          <Table className="text-normal">
            <TableHeader />
            <Loader />
          </Table>
        </div>
      </div>
    </Layout>
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
