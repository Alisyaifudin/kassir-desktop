import { Layout } from "./z-Layout";
import { ExtraPanel } from "./z-ExtraPanel";
import { Table, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Loader, useStream } from "~/components/Loader";
import { service } from "~/services";
import { ExtraList } from "./z-ExtraList";
import { ExtraErrorBoundary, ExtraErrorFallback } from "./z-Error";
import { Loading } from "./z-LoadingTable";

export default function Page() {
  return (
    <Layout className="flex flex-col gap-5 py-2 px-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <ExtraPanel />
      <div className="flex-1 overflow-hidden min-h-0 w-full">
        <div className="flex flex-col h-full overflow-hidden">
          <Table className="text-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right w-[150px]">Jenis</TableHead>
                <TableHead className="text-right w-[200px]">Nilai Awal</TableHead>
                <TableHead className="icon"></TableHead>
              </TableRow>
            </TableHeader>
            <List />
          </Table>
        </div>
      </div>
    </Layout>
  );
}

function List() {
  const res = useStream(service.extra.get.changes);
  return (
    <ExtraErrorBoundary fallback={ExtraErrorFallback}>
      <Loader res={res} fallback={<Loading />}>
        {({ data: extras }) => <ExtraList all={extras} />}
      </Loader>
    </ExtraErrorBoundary>
  );
}
