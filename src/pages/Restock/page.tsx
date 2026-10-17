import { Checkout } from "./Checkout";
import { Draft } from "./Draft";
import { ManualLine } from "./Draft/z-ManualLine";

/**
 * The restock screen: the sale screen's shape, buying instead of selling.
 *
 * A narrow left column takes input and settles the purchase; the wide right
 * column holds the purchase itself. Components are filed by role rather than by
 * which half of the screen they sit in, so where a piece goes is decided here
 * and nowhere else — `z-ManualLine` lives under `Draft/` because what it makes
 * is a draft line, and is placed in the left column because that is where the
 * operator's hands are.
 *
 * Scaffolding: everything on this screen reads from `mock.ts`. No service, no
 * store, no transaction. Buttons and selects are live but do nothing.
 */
export default function Page() {
  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <div className="grid h-full grid-cols-[clamp(700px,33%,800px)_1fr] gap-2 overflow-x-hidden pt-1 small:grid-cols-[clamp(360px,33%,500px)_1fr]">
        <aside className="flex h-full w-full flex-col justify-between overflow-hidden border-r">
          <div className="flex min-h-0 flex-col overflow-y-auto">
            <ManualLine />
          </div>
          <Checkout />
        </aside>
        <Draft />
      </div>
    </main>
  );
}
