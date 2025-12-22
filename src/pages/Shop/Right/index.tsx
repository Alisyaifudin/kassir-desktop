import { ProductList } from "./Product";
import { ExtraList } from "./Extra";
import { Tab } from "./Tab";
import { GrandTotal } from "./GrandTotal";
import { Header } from "./Header";
import { use, useEffect } from "react";
import { cn, Result } from "~/lib/utils";
import { Customer } from "./Customer";
import { TabInfo } from "~/transaction/transaction/get-all";
import { TextError } from "~/components/TextError";
import { tx } from "~/transaction";
import { tabsStore } from "../use-tab";

export function Right({
  tabs: promise,
}: {
  tabs: Promise<Result<"Aplikasi bermasalah", TabInfo[]>>;
}) {
  const [errMsg, tabs] = use(promise);
  useEffect(() => {
    if (tabs === null) return;
    async function init(tabs: TabInfo[]) {
      if (tabs.length === 0) {
        const [errMsg, tab] = await tx.transaction.add();
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
      <Customer />
      <GrandTotal />
    </div>
  );
}
