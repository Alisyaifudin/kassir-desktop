import type { ReactNode } from "react";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { SaveError } from "~/components/SaveError";
import { service } from "~/services";
import type { Draft as DraftModel } from "~/services/transaction";
import { CartStartError } from "~/components/cart/z-StartError";
import type { CartScreen } from "~/components/cart/use-cart-screen";

/**
 * The parts of the Pos and Restock screens that were literally the same file
 * twice: the route's `<main>` plus the draft stream's loader, the "no cart yet"
 * branch, the panel column that goes `inert` while a commit is in flight (with
 * the blocking overlay), and the slot the completion dialog is rendered into.
 *
 * What stays in the pages is what genuinely differs: their stage list, their
 * panels, their F1/F2 handlers and their completion payload.
 */

/** The route body: the open drafts of this mode, loaded once. */
export function CartRoute({ children }: { children: (drafts: DraftModel[]) => ReactNode }) {
  const res = useStream(service.transaction.get.changes);
  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <Loader res={res} fallback={<Loading />}>{({ data }) => children(data)}</Loader>
    </main>
  );
}

/**
 * The completion dialog is the last child of every state of the screen. If it
 * changed position between "no cart yet" and "cart open", restoring a draft
 * would remount it and the operator would see a close → open flash.
 */
export function CartBody({ dialog, children }: { dialog: ReactNode; children: ReactNode }) {
  return (
    <>
      {children}
      {dialog}
    </>
  );
}

/** No draft yet: either it is being made, or it could not be made. */
export function CartEmpty({ cart }: { cart: Pick<CartScreen, "startError" | "retryStart"> }) {
  if (cart.startError === null) return <Loading />;
  return <CartStartError message={cart.startError} onRetry={cart.retryStart} />;
}

/**
 * The panel column. `inert` while submitting, because the record is already
 * committed at that point: nothing else may be edited until the dialog says so.
 */
export function CartPanels({
  submitting,
  children,
}: {
  submitting: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex h-full min-h-0 flex-col gap-2 overflow-x-hidden pt-1"
      inert={submitting}
    >
      {children}
      <SaveError />
      {submitting ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
          <Loading />
        </div>
      ) : null}
    </div>
  );
}
