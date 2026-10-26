import type { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { Effect, Layer } from "effect";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { pageCache } from "~/components/page-data";
import { makeTestDatabase } from "~/services/db/test-support";
import { makeTestLocalStorage } from "~/services/local-storage/test-support";
import { makeTestStore } from "~/services/store/test-support";
import type { Binding } from "~/services/db";
import { buildAppLive, makeService } from "~/services/wiring";
import type { DraftMode } from "~/services/transaction";

/**
 * The two till screens, wired to the real service layers over the real
 * migrations. Only the Tauri backends are substituted (db/store/local-storage
 * test-support) — the same seam the e2e harness uses, one process in.
 *
 * Each test gets a fresh database, store and localStorage. The pages import the
 * `service` singleton, so the mock hands them a stable proxy whose properties
 * resolve to the service built for the current test: a new till per test, and
 * one module graph for the pages.
 */
export type ProductSeed = {
  name: string;
  price: number;
  stock?: number;
  capital?: number;
  code?: string | null;
};

export type TillSeed = {
  products?: ProductSeed[];
  extras?: { name: string; value: number; kind?: "number" | "percent"; flag?: number }[];
  customers?: { name: string; phone?: string }[];
  suppliers?: { name: string; note?: string }[];
};

const CASHIER = { id: "c1", name: "Raisya", role: "admin" as const };

import { currentService, offerService } from "./service-proxy";

const PosPage = (await import("~/pages/Pos/page")).default;
const RestockPage = (await import("~/pages/Restock/page")).default;

/** Fresh migrations + backends + session, then seed through the services. */
export async function freshTill(seed: TillSeed = {}) {
  const { db, layer: dbLayer } = makeTestDatabase();
  const store = makeTestStore();
  const storage = makeTestLocalStorage({ user: CASHIER });

  const current = offerService(
    makeService(buildAppLive(Layer.mergeAll(dbLayer, store.layer, storage.layer))),
  );
  pageCache.clear();

  await Effect.runPromise(
    current.cashier.add({ id: CASHIER.id, name: CASHIER.name, role: "admin", hash: "h" }),
  );
  for (const product of seed.products ?? []) {
    await Effect.runPromise(
      current.product.add({
        name: product.name,
        note: "",
        listings: [
          {
            name: product.name,
            price: product.price,
            unit: 1,
            kind: "",
            code: product.code ?? null,
          },
        ],
        stocks: [
          {
            value: product.stock ?? 10,
            capital: product.capital ?? Math.round(product.price / 2),
          },
        ],
        properties: [],
      }),
    );
  }
  for (const extra of seed.extras ?? []) {
    await Effect.runPromise(
      current.extra.add({
        name: extra.name,
        value: extra.value,
        kind: extra.kind ?? "number",
        flag: extra.flag ?? 0,
      }),
    );
  }
  for (const customer of seed.customers ?? []) {
    await Effect.runPromise(current.customer.add(customer.name, customer.phone ?? ""));
  }
  for (const supplier of seed.suppliers ?? []) {
    await Effect.runPromise(current.supplier.add(supplier.name, supplier.note ?? ""));
  }

  return { db, store, storage, service: current };
}

export function renderTill(route: "pos" | "restock", entry?: string) {
  const Page = route === "pos" ? PosPage : RestockPage;
  return render(
    <MemoryRouter initialEntries={[entry ?? `/${route}`]}>
      <Routes>
        <Route path="*" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

export const tillService = () => currentService();

export const openDrafts = (mode: DraftMode) =>
  Effect.runPromise(tillService().transaction.get.drafts(mode));

/** Cart writes are debounced; put them on disk before reading the table. */
export async function flushTill() {
  await act(async () => {
    await Effect.runPromise(tillService().transaction.flush());
  });
}

/** The one open cart's id, once the screen has made it. */
export async function openDraftId(mode: DraftMode): Promise<string> {
  await waitFor(() => expect(screen.getAllByRole("tab").length).toBeGreaterThan(0));
  const drafts = await openDrafts(mode);
  const draft = drafts[0];
  if (draft === undefined) throw new Error(`no open ${mode} cart`);
  return draft.id;
}

/**
 * A scan: type the text and press Enter before the debounce settles, which is
 * the path a barcode gun takes. The pick lands as soon as its search answers;
 * the bar empties, which is what the wait is on.
 */
export async function scan(text: string) {
  const search = screen.getByPlaceholderText(/Cari barang/i) as HTMLInputElement;
  fireEvent.change(search, { target: { value: text } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => {
    expect((screen.getByPlaceholderText(/Cari barang/i) as HTMLInputElement).value).toBe("");
  });
}

/** Give the open cart a single tender of `amount` (the payment modal is its own test). */
export async function setTender(mode: DraftMode, amount: number, methodId = "1000") {
  const id = await openDraftId(mode);
  await act(async () => {
    await Effect.runPromise(
      tillService().transaction.methods.set(id, [{ id: "pay-1", methodId, value: amount }]),
    );
  });
  return id;
}

/** Type into the inline amount editor of the payment strip and commit it. */
export async function typeInlineTender(amount: number) {
  const cell = document.getElementById("cell-payment-amount");
  if (cell === null) throw new Error("the inline amount cell is not on screen");
  fireEvent.click(cell);
  const input = await waitFor(() => {
    const field = document.getElementById("payment-amount-0");
    if (field === null) throw new Error("the amount editor did not open");
    return field as HTMLInputElement;
  });
  await act(async () => {
    fireEvent.change(input, { target: { value: String(amount) } });
    fireEvent.keyDown(input, { key: "Enter" });
  });
}

export function queryAll<T>(db: Database, sql: string, params: Binding[] = []): T[] {
  return db.query<T, Binding[]>(sql).all(...params) as T[];
}

export function queryOne<T>(db: Database, sql: string, params: Binding[] = []): T | null {
  return (db.query<T, Binding[]>(sql).get(...params) as T | null) ?? null;
}
