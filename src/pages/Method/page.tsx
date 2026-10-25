import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import type { DefaultableKind } from "~/lib/constants";
import { pageData } from "./data";
import { Item } from "./z-Item";
import { NewBtn } from "./z-NewBtn";
import { TabLink } from "./z-TabLink";
import { useMethod } from "./use-method";
import { namedMethodsOf } from "./util-method";

/**
 * The head, the kind tabs and the add button are static; the rows are the only
 * thing that waits, and the tab you are on is a URL value, not data.
 */
export default function Page() {
  const [kind] = useMethod();

  return (
    <pageData.Provider sources={{ catalog: service.method.get.catalogChanges }}>
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Metode Pembayaran</h1>
          <p className="text-muted-foreground text-normal">
            Kelola metode pembayaran yang tersedia
          </p>
        </div>

        <div className="space-y-4 ">
          <TabLink />
          <List kind={kind} />
        </div>
        <NewBtn />
      </div>
    </pageData.Provider>
  );
}

function List({ kind }: { kind: DefaultableKind }) {
  return (
    <pageData.Gate
      keys={["catalog"]}
      pulse={<LoadingList />}
      error={(error) => (
        <TextError>{`Metode pembayaran bermasalah: ${error.message}`}</TextError>
      )}
    >
      {({ catalog }) => {
        const methods = namedMethodsOf(catalog.methods, kind);
        return (
          <div className="flex flex-col gap-2 overflow-auto">
            {methods.map((method) => (
              <Item key={method.id} method={method} defVal={catalog.defaults[kind]} />
            ))}
          </div>
        );
      }}
    </pageData.Gate>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat metode">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30">
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
