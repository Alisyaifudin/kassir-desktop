import { TabsContent as TabsContentRaw } from "~/components/ui/tabs";
import { Search } from "./z-SearchBar";
import { ProductManual } from "./ProductManual";
import { ExtraManual } from "./ExtraManual";
import { Effect, Either } from "effect";
import { db } from "~/database-effect";
import { dbItemsStore } from "../../store/db";
import { useMicro } from "~/hooks/use-micro";
import { key } from "../../utils/keys";
import { logOld } from "~/lib/utils";
import { TextError } from "~/components/TextError";

export function Content() {
  const res = useMicro({
    fn: () => loader(),
    key: key.db,
  });
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight() {
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
