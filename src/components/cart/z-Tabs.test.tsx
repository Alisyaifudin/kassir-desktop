import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Draft } from "~/services/transaction";
import { STORED_FLAG } from "~/services/transaction";

/**
 * The tab strip is how a cashier parks a sale and serves the next customer —
 * the one action on the POS with no keyboard affordance at all until now: the
 * tabs were `<div onClick>` with no role, no tab stop and no key handler, so
 * Tabbing the cart walked a row of delete buttons. This pins the ARIA tabs
 * pattern: one Tab stop, arrows select, Enter selects, Delete confirms.
 */
mock.module("~/services", () => ({
  service: {
    transaction: {
      add: { new: () => ({}) },
      delete: { byId: () => ({}) },
    },
  },
}));

const { CartPanel, Tabs, cartTabId } = await import("./z-Tabs");

function makeDraft(id: string, title: string, flag = 0): Draft {
  return {
    id,
    order: 0,
    flag,
    title,
    mode: "incoming",
    fix: 0,
    note: "",
    customerId: null,
    customerName: "",
    customerPhone: "",
    paidAt: null,
    supplierId: null,
    supplierName: "",
    rounding: 0,
    listings: [],
    extras: [],
    methods: [],
    images: [],
  };
}

const drafts = [makeDraft("d1", "Kopi"), makeDraft("d2", "Teh"), makeDraft("d3", "Gula")];

function renderStrip(activeId = "d1") {
  const selected: string[] = [];
  render(
    <>
      <Tabs mode="sale" drafts={drafts} activeId={activeId} onSelect={(id) => selected.push(id)} />
      <CartPanel draftId={activeId}>isi keranjang</CartPanel>
    </>,
  );
  return { selected, tabs: screen.getAllByRole("tab") };
}

describe("cart tab strip", () => {
  test("is a tablist of tabs with exactly one tab stop", () => {
    const { tabs } = renderStrip("d2");
    expect(screen.getByRole("tablist", { name: "Transaksi terbuka" })).toBeTruthy();
    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(tabs.map((tab) => tab.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  test("the X close buttons are not tab stops", () => {
    renderStrip();
    for (const button of screen.getAllByRole("button")) {
      if (button.getAttribute("aria-label")?.startsWith("Hapus ")) {
        expect(button.getAttribute("tabindex")).toBe("-1");
      }
    }
  });

  test("ArrowRight selects the next cart and moves focus to it", () => {
    const { selected, tabs } = renderStrip("d1");
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(selected).toEqual(["d2"]);
    expect(document.activeElement).toBe(tabs[1]);
  });

  test("ArrowLeft from the first cart wraps to the last", () => {
    const { selected, tabs } = renderStrip("d1");
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(selected).toEqual(["d3"]);
  });

  test("Enter selects the focused cart", () => {
    const { selected, tabs } = renderStrip("d1");
    fireEvent.keyDown(tabs[2], { key: "Enter" });
    expect(selected).toEqual(["d3"]);
  });

  test("a parked cart is selectable and searchable by keyboard", () => {
    const parked = makeDraft("d4", "Tersimpan", STORED_FLAG);
    const selected: string[] = [];
    render(
      <Tabs
        mode="sale"
        drafts={[...drafts, parked]}
        activeId="d1"
        onSelect={(id) => selected.push(id)}
      />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    fireEvent.keyDown(tabs[3], { key: " " });
    expect(selected).toEqual(["d4"]);
  });

  test("every tab names the panel it controls, and only one panel exists", () => {
    const { tabs } = renderStrip("d2");
    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(1);
    const panel = panels[0];
    expect(panel.id).toBe("cart-panel");
    // The panel is labelled by the *selected* cart's tab.
    expect(panel.getAttribute("aria-labelledby")).toBe(cartTabId("d2"));
    for (const [index, tab] of tabs.entries()) {
      expect(tab.getAttribute("aria-controls")).toBe(panel.id);
      expect(tab.id).toBe(cartTabId(drafts[index]!.id));
    }
  });

  test("switching carts relabels the panel to the new tab", () => {
    function Screen() {
      const [active, setActive] = useState("d1");
      return (
        <>
          <Tabs mode="sale" drafts={drafts} activeId={active} onSelect={setActive} />
          <CartPanel draftId={active}>isi keranjang</CartPanel>
        </>
      );
    }
    render(<Screen />);
    const panel = () => screen.getAllByRole("tabpanel")[0];
    expect(panel().getAttribute("aria-labelledby")).toBe(cartTabId("d1"));

    fireEvent.click(screen.getAllByRole("tab")[1]!);
    expect(panel().getAttribute("aria-labelledby")).toBe(cartTabId("d2"));
    expect(screen.getAllByRole("tab")[1]?.getAttribute("aria-selected")).toBe("true");
  });

  test("Delete opens the confirm dialog instead of destroying the cart", () => {
    const { tabs } = renderStrip("d1");
    fireEvent.keyDown(tabs[0], { key: "Delete" });
    expect(screen.getByText("Hapus transaksi?")).toBeTruthy();
  });
});
