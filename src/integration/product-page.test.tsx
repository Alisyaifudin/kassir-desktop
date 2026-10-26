import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { pageCache } from "~/components/page-data";
import { offerService } from "./service-proxy";
import { makeTestDatabase } from "~/services/db/test-support";
import { makeTestLocalStorage } from "~/services/local-storage/test-support";
import { makeTestStore } from "~/services/store/test-support";
import { buildAppLive, makeService } from "~/services/wiring";

/**
 * The Product screen, integrated: the real catalog service over the real schema,
 * the real `pageData` provider/gate, the real list-state hook and the real grid —
 * only the Tauri backends are substituted.
 *
 * The page's unit tests pin the grid, the table, the filter and the search ladder
 * one at a time. This one pins the join: a product written by the service appears
 * on the screen, and a write that lands while the screen is open moves it.
 */
const { db, layer: dbLayer } = makeTestDatabase();
const store = makeTestStore();
// An admin session; the auth service verifies this id against `cashiers`.
const storage = makeTestLocalStorage({
  user: { id: "c1", name: "Ani", role: "admin" },
});

const service = offerService(
  makeService(buildAppLive(Layer.mergeAll(dbLayer, store.layer, storage.layer))),
);

const Page = (await import("~/pages/Product/page")).default;

db.exec(`INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash)
  VALUES ('c1', 'Ani', 'admin', 'h')`);

function addProduct(name: string, price: number, code: string | null = null) {
  return Effect.runPromise(
    service.product.add({
      name,
      note: "",
      listings: [{ name, price, unit: 1, kind: "retail", code }],
      stocks: [{ value: 10, capital: Math.round(price / 2) }],
      properties: [],
    }),
  );
}

function renderPage(entry = "/products") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="*" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  pageCache.clear();
  // Every test starts on this file's service (the pages share one module).
  offerService(service);
});

describe("the product screen over the real services", () => {
  test("a product the service holds is on the screen, with its price", async () => {
    await act(async () => addProduct("Kopi Tubruk", 12_000));

    renderPage();

    expect(await screen.findByText("Kopi Tubruk")).toBeDefined();
    expect(screen.getAllByText("Rp12.000").length).toBeGreaterThan(0);
    // An admin gets the add control; the page decides that from the session.
    expect(screen.getByLabelText("Tambah produk")).toBeDefined();
  });

  test("a product added while the screen is open appears without a reload", async () => {
    await act(async () => addProduct("Kopi Susu", 12_000));
    renderPage();
    await screen.findByText("Kopi Susu");
    expect(screen.queryByText("Susu Jahe")).toBeNull();

    await act(async () => addProduct("Susu Jahe", 5_000, "T1"));

    expect(await screen.findByText("Susu Jahe")).toBeDefined();
    expect(screen.getAllByText("Rp5.000").length).toBeGreaterThan(0);
  });

  test("the URL's search narrows the grid", async () => {
    await act(async () => addProduct("Kopi Susu", 12_000));
    await act(async () => addProduct("Teh Melati", 5_000));

    renderPage("/products?q=melati");

    expect(await screen.findByText("Teh Melati")).toBeDefined();
    expect(screen.queryByText("Kopi Susu")).toBeNull();
  });

  test("a withdrawn product stays in the list but reads as withdrawn", async () => {
    const id = await act(async () => addProduct("Kopi Luwak", 90_000));
    await act(async () => Effect.runPromise(service.product.set.publish(id, false)));

    renderPage();

    expect(await screen.findByText("Kopi Luwak")).toBeDefined();
    // The grid keeps the row and labels it, rather than hiding stock from the owner.
    expect(screen.getAllByText("Tidak terbit").length).toBeGreaterThan(0);
  });
});
