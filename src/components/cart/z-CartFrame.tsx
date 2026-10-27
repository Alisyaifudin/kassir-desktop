import type { ReactNode } from "react";
import { Loading } from "~/components/Loading";
import { SaveError } from "~/components/SaveError";

/**
 * The parts of the Pos and Restock screens that were literally the same file
 * twice: the panel column that goes `inert` while a commit is in flight (with the
 * blocking overlay), and the slot the completion dialog is rendered into.
 *
 * What stays in the pages is what genuinely differs: their `<main>`, their draft
 * stream and its loading branch, their stage list, their panels, their F1/F2/F3
 * handlers and their completion payload.
 */

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

/**
 * The panel column. `inert` while submitting, because the record is already
 * committed at that point: nothing else may be edited until the dialog says so.
 *
 * `overflow-hidden`, deliberately, and not `overflow-x-hidden`: CSS resolves an
 * element whose axes disagree by turning the visible one into `auto`, so
 * `overflow-x-hidden` alone made this column a *vertical* scroll container — one
 * that only ever scrolled a rounding residue (the column is `100%` of a window
 * whose height in CSS pixels is fractional at a scaled display, and the last
 * child's box rounds up to the device pixel grid, leaving a fraction of a pixel
 * of scrollable area). On a 100%-scaled machine the arithmetic lands on whole
 * pixels and nothing appears; at 125%/150% the panel grew a 1–2px scrollbar
 * wedged under the navbar, on both cart screens, and it stole width from the
 * grid when it appeared. Nothing in here should scroll: the goods grid and the
 * purchase's stage panel are the ones with scroll boxes of their own.
 */
export function CartPanels({ submitting, children }: { submitting: boolean; children: ReactNode }) {
  return (
    <div
      className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden pt-1"
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
