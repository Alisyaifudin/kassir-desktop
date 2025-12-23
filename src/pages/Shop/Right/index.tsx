import { ProductList } from "./Product";
import { ExtraList } from "./Extra";
import { Tab } from "./Tab";
import { GrandTotal } from "./GrandTotal";
import { Header } from "./Header";
import { Suspense, use, useEffect } from "react";
import { capitalize, cn, Result } from "~/lib/utils";
import { Customer } from "./Customer";
import { TabInfo } from "~/transaction/transaction/get-all";
import { TextError } from "~/components/TextError";
import { tx } from "~/transaction";
import { tabsStore } from "../use-tab";
import { Note } from "../Left/Summary/Note";
import { Loading } from "~/components/Loading";
import { Customer as CustomerDB } from "~/database/customer/get-all";
import { CustomerDialog } from "./CustomerDialog";
import { auth } from "~/lib/auth";

export function Right({
  tabs: promise,
  customers,
}: {
  tabs: Promise<Result<"Aplikasi bermasalah", TabInfo[]>>;
  customers: Promise<Result<"Aplikasi bermasalah", CustomerDB[]>>;
}) {
  const [errMsg, tabs] = use(promise);
  const username = auth.get()?.name ?? "admin";
  useEffect(() => {
    if (tabs === null) return;
    async function init(tabs: TabInfo[]) {
      if (tabs.length === 0) {
        const [errMsg, tab] = await tx.transaction.addNew();
        if (errMsg) {
          throw new Error(errMsg);
        }
        tabs.push({ tab, mode: "sell" });
      }
      tabsStore.set(tabs);
    }
    init(tabs);
  }, [tabs]);
  if (errMsg !== null) return <TextError>{errMsg}</TextError>;
  if (tabs.length === 0) return <div className="animate-pulse h-full w-full"></div>;
  return (
    <div className="border-r flex-1 flex flex-col m-1 gap-2">
      <div className="outline flex-1 p-1 flex flex-col gap-1 overflow-hidden">
        <div className="flex flex-col">
          <Tab tabs={tabs} />
          <Header />
        </div>
        <div className={cn("flex flex-1 flex-col overflow-y-auto min-h-0 h-full")}>
          <ExtraList />
          <ProductList />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Note />
          <Suspense fallback={<Loading />}>
            <CustomerDialog customers={customers} />
          </Suspense>
          <Customer />
        </div>
        <p className="px-2 text-end">Kasir: {capitalize(username)}</p>
      </div>
      <GrandTotal />
    </div>
  );
}
