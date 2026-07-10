import { Right } from "./z-Right";
import { Left } from "./z-Left";
import { Complete } from "./z-Complete";
import { Effect } from "effect";
import { TransactionService } from "~/services/transaction";
import Redirect from "~/components/Redirect";

const page = Effect.gen(function* () {
  const txService = yield* TransactionService;
  const useTx = (id: string) => txService.useTxSafe(id);
  const useTabs = () => txService.useTabs();
  return function Page({ id }: { id: string }) {
    return (
      <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
        <div className="gap-2 pt-1 grid-cols-[clamp(700px,33%,800px)_1fr] grid small:grid-cols-[clamp(360px,33%,500px)_1fr] overflow-x-hidden h-full">
          <aside className="flex flex-col overflow-hidden justify-between w-full h-full border-r">
            <TabSection />
            <Summary />
          </aside>
          <div className="border-r flex-1 flex flex-col m-1 overflow-hidden">
            <Header />
            <ProductList />
            <div className="flex items-center justify-between border-t">
              <div className="flex items-center gap-3">
                <p className="px-2 text-end">Kasir: {capitalize(username)}</p>
                <Note />
                <CustomerDialog />
                <Customer />
              </div>
              <Precision />
            </div>
            <GrandTotal />
          </div>
        </div>
        <Complete />
      </main>
    );
  };
});

export default page;
