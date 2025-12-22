import { Right } from "./Right";
import { Left } from "./Left";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { basicStore } from "./use-transaction";
import { TextError } from "~/components/TextError";
import { Suspense, useEffect, useState } from "react";
import { LoadingRight } from "./Right/loading";
import { useTab } from "./use-tab";
import { loadingStore } from "./Right/use-total";
import { tx } from "~/transaction";

export default function Page() {
  const { product, customers, methods, tabs } = useLoaderData<Loader>();
  useEffect(() => {
    document.body.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "F1": {
          const el = document.getElementById("searchbar");
          el?.focus();
          break;
        }
        case "F2": {
          const el = document.getElementById("pay-input");
          el?.focus();
          break;
        }
      }
    });
  }, []);
  const [tab] = useTab();
  const [error, setError] = useState<null | string>(null);
  useEffect(() => {
    if (tab === undefined) return;
    async function init(tab: number) {
      loadingStore.trigger.setTransaction({ value: true });
      const [errMsg, res] = await tx.transaction.get.byTab(tab);
      loadingStore.trigger.setTransaction({ value: false });
      setError(errMsg);
      if (errMsg !== null) {
        return;
      }
      basicStore.set({
        rounding: 0,
        fix: res.fix,
        methodId: res.methodId,
        mode: res.mode,
        note: res.note,
        query: res.query,
      });
    }
    init(tab);
  }, [tab]);
  if (error !== null)
    return (
      <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
        <TextError>{error}</TextError>
      </main>
    );
  return (
    <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
      <div className="gap-2 pt-1 flex h-full">
        <Left customers={customers} methods={methods} product={product} />
        <Suspense fallback={<LoadingRight />}>
          <Right tabs={tabs} />
        </Suspense>
      </div>
    </main>
  );
}
