import { TabsContent as TabsContentRaw } from "~/components/ui/tabs";
import { Search } from "./z-SearchBar";
import { ProductManual } from "./ProductManual";
import { ExtraManual } from "./ExtraManual";
import { Effect } from "effect";
import { db } from "~/database";
import { dbItemsStore } from "../../store/db";
import { TextError } from "~/components/TextError";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export function Content() {
  const res = Result.use({
    fn: () => loader(),
    key: "productAndExtra",
    revalidateOn: {
      unmount: true,
    },
  });
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess() {
      return (
        <>
          <TabContent value="auto">
            <Search />
          </TabContent>
          <TabContent value="man">
            <ProductManual />
          </TabContent>
          <TabContent value="add">
            <ExtraManual />
          </TabContent>
        </>
      );
    },
  });
}

function TabContent({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <TabsContentRaw value={value} className="flex w-full flex-col px-1 gap-2  grow shrink basis-0">
      {children}
    </TabsContentRaw>
  );
}

function Loading() {
  return (
    <>
      <TabContent value="auto">
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <Skeleton className="h-10 w-full" />
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </TabContent>
      <TabContent value="man">
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-40" />
        </div>
      </TabContent>
      <TabContent value="add">
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-40" />
        </div>
      </TabContent>
    </>
  );
}

function loader() {
  return Effect.gen(function* () {
    const [products, extras] = yield* Effect.all([db.product.get.all(), db.extra.get.all()], {
      concurrency: "unbounded",
    });
    dbItemsStore.set({
      products,
      extras,
    });
  });
}
