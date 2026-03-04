import { ProductList } from "./Product";
import { ExtraList } from "./Extra";
import { GrandTotal } from "./z-GrandTotal";
import { Suspense } from "react";
import { capitalize } from "~/lib/utils";
import { Customer } from "./z-Customer";
import { useTab, useTabs } from "./Header/use-tab";
import { Note } from "../Left/Summary/z-Note";
import { Loading } from "~/components/Loading";
import { CustomerDialog } from "./CustomerDialog";
import { auth } from "~/lib/auth";
import { Watermark } from "./z-Watermark";
import { Header } from "./Header";

export function Right() {
  const tabs = useTabs();
  const [tab] = useTab();
  const username = auth.get()?.name ?? "admin";
  if (tabs.length === 0 || tab === undefined)
    return <div className="animate-pulse h-full w-full"></div>;
  return (
    <div className="border-r flex-1 flex flex-col m-1 gap-2">
      <div className="outline flex-1 p-1 flex flex-col gap-1 overflow-hidden">
        <Header />
        <Watermark>
          <Suspense>
            <ExtraList tab={tab} />
          </Suspense>
          <Suspense>
            <ProductList tab={tab} />
          </Suspense>
        </Watermark>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Note />
          <Suspense fallback={<Loading />}>
            <CustomerDialog />
          </Suspense>
          <Customer />
        </div>
        <p className="px-2 text-end">Kasir: {capitalize(username)}</p>
      </div>
      <GrandTotal />
    </div>
  );
}
