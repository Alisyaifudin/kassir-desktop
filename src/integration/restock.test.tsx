import { beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Effect } from "effect";
import {
  flushTill,
  freshTill,
  openDraftId,
  renderTill,
  scan,
  setTender,
  tillService,
} from "./till-harness";

/**
 * `/restock`, integrated: the purchase side of the cart over the real services
 * and migrations. It shares the goods grid, the settle strip and the commit path
 * with Pos, and differs in what those actions mean: three stages, a supplier,
 * stock arriving instead of leaving, and a credit purchase that is a different
 * kind of record rather than a partial payment.
 */
const seed = {
  products: [
    { name: "Kopi", price: 10_000, stock: 15, capital: 6_000 },
    { name: "Teh", price: 5_000, stock: 8, capital: 3_000 },
  ],
  suppliers: [{ name: "Toko Sumber", note: "antar Senin" }],
};

let db: Awaited<ReturnType<typeof freshTill>>["db"];

beforeEach(async () => {
  ({ db } = await freshTill(seed));
});

const grand = () => screen.getByTestId("grand-total").textContent;
const lines = () => screen.queryAllByTestId("cart-line");
const bayar = () => screen.getByRole("button", { name: "Bayar" });
const bayar$ = () => screen.queryByRole("button", { name: "Bayar" });
const next = () => screen.getByRole("button", { name: /Berikutnya/ });

/** Walk goods → charges → payment. */
async function toPayment() {
  fireEvent.click(next());
  fireEvent.click(next());
  await waitFor(() => expect(screen.queryByRole("button", { name: "Bayar" })).not.toBeNull());
}

describe("the purchase screen on arrival", () => {
  test("opens on the goods stage with one cart and no Bayar yet", async () => {
    renderTill("restock");

    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(1));
    expect(screen.getByRole("button", { name: /Berikutnya/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Bayar" })).toBeNull();
    await flushTill();
    expect(
      queryOneMode(db),
    ).toBe("outcoming");
  });

  test("Sebelumnya walks back from payment to the goods", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await toPayment();
    expect(screen.queryByRole("button", { name: "Bayar" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Bayar" })).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    expect(screen.queryByRole("button", { name: "Bayar" })).toBeNull();
    expect(screen.getByRole("button", { name: /Berikutnya/ })).toBeDefined();
  });

  test("F2 opens the charges stage, with the cursor in its search bar", async () => {
    renderTill("restock");
    await openDraftId("outcoming");

    fireEvent.keyDown(document.body, { key: "F2" });

    // The charges grid, not the goods: its search bar is the stage's own field.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText(/Cari biaya tambahan/i),
      ),
    );
  });

  test("F3 opens the payment stage from the charges", async () => {
    renderTill("restock");
    await openDraftId("outcoming");

    fireEvent.keyDown(document.body, { key: "F2" });
    fireEvent.keyDown(document.body, { key: "F3" });

    await waitFor(() => expect(screen.queryByRole("button", { name: "Bayar" })).not.toBeNull());
  });

  test("F1 comes back to the goods from the payment stage", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await toPayment();

    fireEvent.keyDown(document.body, { key: "F1" });

    await waitFor(() => expect(screen.queryByRole("button", { name: "Bayar" })).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText(/Cari barang untuk dibeli/i),
      ),
    );
  });
});

/**
 * Open the inline amount editor, type a tender, and press Enter in it.
 *
 * The pause between typing and Enter is the point: the tender reaches the draft
 * through the service, and the screen's "is the change negative?" is read on the
 * render after that — which is the order a cashier's fingers work in, and the one
 * `typeInlineTender` (same tick) does not reproduce.
 */
async function tenderThenEnter(amount: number) {
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
  });
  await flushTill();

  await act(async () => {
    fireEvent.keyDown(input, { key: "Enter" });
  });
}

describe("paying from the amount field", () => {
  test("Enter on the last payment value pays the purchase", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await scan("Teh");
    await waitFor(() => expect(grand()).toBe("Rp5.000"));
    await toPayment();

    await tenderThenEnter(5_000);

    expect(await screen.findByRole("heading", { name: "Pembelian berhasil" })).toBeDefined();
  });

  test("an underpaid amount keeps the editor instead of paying", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await scan("Teh");
    await waitFor(() => expect(grand()).toBe("Rp5.000"));
    await toPayment();

    await tenderThenEnter(1_000);

    expect(screen.queryByRole("heading", { name: "Pembelian berhasil" })).toBeNull();
    expect(document.getElementById("payment-amount-0")).not.toBeNull();
  });
});

describe("after a purchase is paid", () => {
  test("the goods come back, with the cursor in the search bar", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await scan("Teh");
    await waitFor(() => expect(grand()).toBe("Rp5.000"));
    await toPayment();
    await setTender("outcoming", 5_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bayar());
    expect(await screen.findByRole("heading", { name: "Pembelian berhasil" })).toBeDefined();

    // The X: the record is committed, so closing only starts the next purchase.
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(bayar$()).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText(/Cari barang untuk dibeli/i),
      ),
    );
  });
});

describe("committing a purchase", () => {
  test("Bayar receives stock instead of consuming it", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await scan("Teh");
    await waitFor(() => expect(grand()).toBe("Rp5.000"));
    expect(lines()).toHaveLength(1);

    await toPayment();
    await setTender("outcoming", 5_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bayar());

    expect(await screen.findByRole("heading", { name: "Pembelian berhasil" })).toBeDefined();
    await flushTill();

    const record = queryOneRec(db);
    expect(record.mode).toBe("outcoming");
    expect(record.total).toBe(5_000);
    expect(record.pay).toBe(5_000);
    expect(record.paid_at).toEqual(expect.any(Number));
    expect(record.pair_id).toBeNull();

    expect(stockOf(db, "Teh")).toBe(9);
    expect(
      db
        .query<{ delta: number }, []>(
          "SELECT product_event_value AS delta FROM product_events ORDER BY product_event_created_at DESC LIMIT 1",
        )
        .get()?.delta,
    ).toBe(1);
    expect(db.query("SELECT tx_record_id FROM tx_records").all()).toHaveLength(0);
  });

  test("an underpaid purchase keeps Bayar closed", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    await toPayment();
    await setTender("outcoming", 4_000);

    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(true));
  });
});

describe("a credit purchase", () => {
  test("Kredit records the debt and receives the stock with no payment", async () => {
    renderTill("restock");
    await openDraftId("outcoming");
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));
    await toPayment();

    fireEvent.click(screen.getByRole("button", { name: "Kredit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Kredit" }));

    expect(await screen.findByRole("heading", { name: "Kredit berhasil" })).toBeDefined();
    await flushTill();

    const record = queryOneRec(db);
    expect(record.mode).toBe("outcoming");
    expect(record.paid_at).toBeNull();
    expect(record.credit_at).toEqual(expect.any(Number));
    expect(record.pay).toBe(0);
    expect(record.total).toBe(10_000);

    // The goods arrived even though nobody paid.
    expect(stockOf(db, "Kopi")).toBe(16);

    const debt = await Effect.runPromise(tillService().record.get.debt());
    expect(debt).toHaveLength(1);
    expect(debt[0].total).toBe(10_000);
  });

  test("Kredit is closed while there is nothing to settle", async () => {
    renderTill("restock");
    await openDraftId("outcoming");

    await toPayment();

    expect((screen.getByRole("button", { name: "Kredit" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("the purchase's own details", () => {
  test("a supplier typed on the payment stage is written to the draft", async () => {
    renderTill("restock");
    const cartId = await openDraftId("outcoming");
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));
    await toPayment();

    fireEvent.click(screen.getByRole("button", { name: /Info pembelian/ }));
    const supplier = await screen.findByPlaceholderText("Cari atau pemasok baru");
    fireEvent.change(supplier, { target: { value: "Toko Sumber" } });

    // Typing the full name matches the seeded supplier, so the draft carries its
    // id rather than a pending name.
    await waitFor(async () => {
      await flushTill();
      const row = db
        .query<{ name: string | null }, [string]>(
          `SELECT s.supplier_name AS name FROM tx_records t
             LEFT JOIN suppliers s ON s.supplier_id = t.tx_record_supplier_id
            WHERE t.tx_record_id = ?`,
        )
        .get(cartId);
      expect(row?.name).toBe("Toko Sumber");
    });
  });
});

// ---------------------------------------------------------------------------
// Small typed readers, so the assertions above stay about behaviour.
// ---------------------------------------------------------------------------

import type { Database } from "bun:sqlite";

function queryOneMode(db: Database): string | undefined {
  return db
    .query<{ mode: string }, []>("SELECT tx_record_mode AS mode FROM tx_records LIMIT 1")
    .get()?.mode;
}

function queryOneRec(db: Database): {
  mode: string;
  total: number;
  pay: number;
  paid_at: number | null;
  credit_at: number | null;
  pair_id: string | null;
} {
  const row = db
    .query<
      {
        mode: string;
        total: number;
        pay: number;
        paid_at: number | null;
        credit_at: number | null;
        pair_id: string | null;
      },
      []
    >(
      `SELECT record_mode AS mode, record_total AS total, record_pay AS pay,
              record_paid_at AS paid_at, record_credit_at AS credit_at,
              record_pair_id AS pair_id
         FROM records`,
    )
    .get();
  if (row === null) throw new Error("no record written");
  return row;
}

function stockOf(db: Database, product: string): number | undefined {
  return db
    .query<{ value: number }, [string]>(
      `SELECT SUM(s.stock_value) AS value FROM stocks s
         JOIN products p ON p.product_id = s.product_id
        WHERE p.product_name = ?`,
    )
    .get(product)?.value;
}
