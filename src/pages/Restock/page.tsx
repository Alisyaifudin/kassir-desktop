import { Draft } from "./Draft";
import { Bottom } from "./z-Bottom";
import { useStage } from "./use-stage";

/**
 * The restock screen: the sale screen's shape, buying instead of selling.
 *
 * Two panels. The top one assembles the purchase and walks through three stages
 * — the goods, the charges on the whole purchase, then the payment. The bottom
 * one carries the grand total and the moves between those stages, so the
 * operator's eyes and hands stay in the same place from first line to last.
 *
 * The stage lives in the URL, so the browser's own back button walks the
 * wizard too — see use-stage.ts.
 *
 * Scaffolding: everything on this screen reads from `mock.ts`. No service, no
 * store, no transaction. Buttons and selects are live but do nothing.
 */
export default function Page() {
  const [stage, setStage] = useStage();
  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-x-hidden pt-1">
        <Draft stage={stage} />
        <Bottom stage={stage} onChange={setStage} />
      </div>
    </main>
  );
}
