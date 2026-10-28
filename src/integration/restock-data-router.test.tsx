import { beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { flushTill, freshTill, openDraftId, scan, setTender } from "./till-harness";

/**
 * The same purchase flow as `restock.test.tsx`, but under the router the app
 * actually runs: a **data** router. `renderTill` uses `<MemoryRouter>`, which
 * hands `?stage=`/`?draft=` writes to a history listener; `createHashRouter` +
 * `<RouterProvider>` (see `src/route.tsx`) goes through `router.navigate` and
 * `useSearchParams`'s data-router path. If the two disagree about the goods
 * coming back after "Pembelian berhasil", this is where it shows.
 */
const RestockPage = (await import("~/pages/Restock/page")).default;

const seed = {
  products: [{ name: "Teh", price: 5_000, stock: 8, capital: 3_000 }],
};

beforeEach(async () => {
  await freshTill(seed);
});

function renderDataRouter(entry = "/restock") {
  const router = createMemoryRouter([{ path: "*", Component: RestockPage }], {
    initialEntries: [entry],
  });
  return { router, ...render(<RouterProvider router={router} />) };
}

const bayar = () => screen.getByRole("button", { name: "Bayar" });
const bayar$ = () => screen.queryByRole("button", { name: "Bayar" });
const next = () => screen.getByRole("button", { name: /Berikutnya/ });

async function toPayment() {
  fireEvent.click(next());
  fireEvent.click(next());
  await waitFor(() => expect(bayar$()).not.toBeNull());
}

describe("the purchase screen under the data router", () => {
  test("the goods come back after the completion dialog is closed", async () => {
    const { router } = renderDataRouter();
    await openDraftId("outcoming");
    await scan("Teh");
    await toPayment();
    await setTender("outcoming", 5_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bayar());
    expect(await screen.findByRole("heading", { name: "Pembelian berhasil" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(bayar$()).toBeNull());
    await act(async () => {
      await flushTill();
    });

    expect(new URLSearchParams(router.state.location.search).get("stage")).not.toBe("payment");
    expect(bayar$()).toBeNull();
    expect(document.activeElement).toBe(screen.getByPlaceholderText(/Cari barang untuk dibeli/i));
  });
});
