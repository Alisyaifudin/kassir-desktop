import { Item } from "./z-Item";
import { NewBtn } from "./z-NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./z-TabLink";
import { Skeleton } from "~/components/ui/skeleton";
import { Loader, useStream } from "~/components/Loader";
import { service } from "~/services";
import { MethodErrorBoundary, MethodErrorFallback } from "./z-Error";
import { namedMethodsOf } from "./util-method";
import type { DefaultableKind } from "~/lib/constants";

export default function Page() {
  const [kind] = useMethod();

  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Metode Pembayaran</h1>
        <p className="text-muted-foreground text-normal">Kelola metode pembayaran yang tersedia</p>
      </div>

      <div className="space-y-4 ">
        <TabLink />
        <List kind={kind} />
      </div>
      <NewBtn />
    </div>
  );
}

function List({ kind }: { kind: DefaultableKind }) {
  const res = useStream(service.method.get.catalogChanges);
  return (
    <MethodErrorBoundary fallback={MethodErrorFallback}>
      <Loader res={res} fallback={<LoadingList />}>
        {({ data: catalog }) => {
          const methods = namedMethodsOf(catalog.methods, kind);
          return (
            <div className="flex flex-col gap-2 overflow-auto">
              {methods.map((method) => (
                <Item key={method.id} method={method} defVal={catalog.defaults[kind]} />
              ))}
            </div>
          );
        }}
      </Loader>
    </MethodErrorBoundary>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30 animate-pulse">
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      ))}
    </div>
  );
}
