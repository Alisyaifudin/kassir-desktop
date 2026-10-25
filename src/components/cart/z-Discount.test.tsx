import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import type { Line } from "./types";
import { DiscountDialog } from "./z-Discount";

/**
 * The line-discount editor is `<Dialog modal={false}>`: Radix's focus trap
 * fights the kind `Select`'s portal on React 19, so the trap is dropped and the
 * dialog is portaled to `document.body`. This is the test that keeps the
 * keyboard held in anyway — the app shell must be inert while the editor is
 * open, and the dialog must announce itself as modal, or Tab (and a screen
 * reader) walks out into the cart grid behind the overlay and Enter edits money
 * under it.
 */
const line: Line = {
  id: "line-1",
  listingId: "l1",
  name: "Kopi",
  code: "",
  unit: 1,
  price: 10_000,
  qty: 1,
  discounts: [],
};

function renderDialog(open: boolean) {
  // The app shell, as `index.html` ships it: the dialog portals beside it.
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  render(
    <DiscountDialog open={open} onOpenChange={() => {}} line={line} onChange={() => {}} />,
    { container: root },
  );
  return root;
}

describe("DiscountDialog keyboard containment", () => {
  test("the app shell is inert and hidden while the editor is open", () => {
    const root = renderDialog(true);

    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(root.hasAttribute("inert")).toBe(true);
    expect(root.getAttribute("aria-hidden")).toBe("true");

    root.remove();
  });

  test("nothing is made inert while the editor is closed", () => {
    const root = renderDialog(false);

    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);

    root.remove();
  });
});
