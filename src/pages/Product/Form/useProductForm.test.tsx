/**
 * Pins the one direction the form takes input from the outside world: the
 * persisted lots.
 *
 * Two things in the app write lots behind the form's back — the manual stock
 * adjustment (which saves immediately) and a record commit from the till, which
 * can *create* a lot when a purchase comes in at a capital the product does not
 * hold yet. The reported bug lived in the second: the History tab showed the
 * `+1`, the lot list did not, and only a restart revealed the lot. A draft only
 * ever replaced its quantities, so a lot the draft had never seen stayed
 * invisible.
 *
 * Run with:  bun test src/pages/Product/Form/useProductForm.test.ts
 */
import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { ProductFull } from "~/services/product";
import { draftFromProduct } from "./types";
import { useProductForm } from "./useProductForm";

type Lot = { id: string; value: number; capital: number };

const lot = (id: string, value: number, capital: number): Lot => ({ id, value, capital });

function product(stocks: Lot[]): ProductFull {
  return {
    id: "p1",
    name: "Kopi",
    note: "",
    flag: 0,
    stocks,
    listings: [],
    properties: [],
    productNames: [],
    images: [],
  } as unknown as ProductFull;
}

function setup(stocks: Lot[]) {
  return renderHook(() => useProductForm(draftFromProduct(product(stocks))));
}

const keys = (view: ReturnType<typeof setup>) => view.result.current.draft.stocks.map((s) => s.key);

describe("persisted lots arriving mid-edit", () => {
  test("a lot the draft has never seen is added, with its quantity and capital", () => {
    const view = setup([lot("s1", 5, 500)]);

    act(() => view.result.current.syncStocks([lot("s1", 5, 500), lot("s2", 3, 900)]));

    expect(view.result.current.draft.stocks).toEqual([
      { key: "s1", value: "5", capital: "500" },
      { key: "s2", value: "3", capital: "900" },
    ]);
  });

  test("an existing row takes the new quantity but keeps the capital being typed", () => {
    const view = setup([lot("s1", 5, 500)]);

    act(() => view.result.current.updateStock("s1", { capital: "777" }));
    act(() => view.result.current.syncStocks([lot("s1", 9, 500)]));

    expect(view.result.current.draft.stocks[0]).toEqual({
      key: "s1",
      value: "9",
      capital: "777",
    });
  });

  test("an unsaved Tambah lot row stays put, after the persisted ones", () => {
    const view = setup([lot("s1", 5, 500)]);

    act(() => view.result.current.addStock());
    const unsaved = keys(view)[1]!;
    expect(unsaved).not.toBe("s1");

    act(() => view.result.current.syncStocks([lot("s1", 5, 500), lot("s2", 3, 900)]));

    expect(keys(view)).toEqual(["s1", "s2", unsaved]);
    expect(view.result.current.draft.stocks[2]?.value).toBe("");
  });

  test("a sync that says nothing new leaves the draft alone — no re-render, no history", () => {
    const view = setup([lot("s1", 5, 500)]);
    const before = view.result.current.draft;

    act(() => view.result.current.syncStocks([lot("s1", 5, 500)]));

    expect(view.result.current.draft).toBe(before);
    expect(view.result.current.canUndo).toBe(false);
  });

  test("an undo cannot take the new lot away — it is not a draft edit", () => {
    const view = setup([lot("s1", 5, 500)]);

    act(() => view.result.current.updateStock("s1", { capital: "600" }));
    act(() => view.result.current.syncStocks([lot("s1", 5, 500), lot("s2", 3, 900)]));
    act(() => view.result.current.undo());

    expect(view.result.current.draft.stocks.map((s) => s.key)).toEqual(["s1", "s2"]);
    // The user's capital edit is what the undo undid.
    expect(view.result.current.draft.stocks[0]?.capital).toBe("500");
  });
});
