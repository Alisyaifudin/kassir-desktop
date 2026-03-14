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
import { Loading } from "~/components/Loading";

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
