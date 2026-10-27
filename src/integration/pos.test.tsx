import { beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import {
  flushTill,
  freshTill,
  openDraftId,
  openDrafts,
  queryAll,
  queryOne,
  renderTill,
  scan,
  setTender,
  tillService,
  typeInlineTender,
} from "./till-harness";

/**
 * `/pos`, integrated: the real cart service, the real product/listing/method/
 * extra services, the real page-data layer and the real cart components over the
 * real migrations. Only the Tauri backends are substituted.
 *
 * The unit suites pin each grid and each hook. This file pins the till's joins —
 * a scan becomes a line and a total, a line becomes a record, the payment strip
 * gates Bayar — and the branches that leave the screen in a different state: a
 * parked cart, a second tab, a manual line, an extra charge, an underpaid tender,
 * a split payment.
 */
const seed = {
  products: [
    { name: "Kopi", price: 10_000, stock: 15, capital: 6_000 },
    { name: "Teh", price: 5_000, stock: 8, capital: 3_000 },
  ],
  extras: [
    { name: "Ongkir", value: 2_000 },
    // DUAL_FLAG: a sale carrying it also books an extras-only outcoming twin.
    { name: "Service", value: 3_000, flag: 1 },
  ],
  customers: [{ name: "Siti", phone: "0811" }],
};

let db: Awaited<ReturnType<typeof freshTill>>["db"];

beforeEach(async () => {
  ({ db } = await freshTill(seed));
});

const grand = () => screen.getByTestId("grand-total").textContent;
const lines = () => screen.queryAllByTestId("cart-line");
const bayar = () => screen.getByRole("button", { name: "Bayar" });
const tabs = () => screen.queryAllByRole("tab");

/** The one open cart, once the screen has made it. */
const ready = () => openDraftId("incoming");

/** A catalog row by name — what a line's origin is read from. */
async function catalogListing(name: string) {
  const all = await Effect.runPromise(tillService().listing.get.all());
  const listing = all.find((item) => item.name === name);
  if (listing === undefined) throw new Error(`no listing called ${name}`);
  return listing;
}

async function scanInto(cartId: string, text: string) {
  await scan(text);
  await waitFor(() => expect(lines()).toHaveLength(1));
  expect(cartId).not.toBe("");
}

describe("the till on arrival", () => {
  test("always has one open cart, and Bayar is disabled while it is empty", async () => {
    renderTill("pos");

    await waitFor(() => expect(tabs()).toHaveLength(1));
    expect((bayar() as HTMLButtonElement).disabled).toBe(true);
    await flushTill();

    const rows = queryAll<{ tx_record_id: string; tx_record_mode: string }>(
      db,
      "SELECT tx_record_id, tx_record_mode FROM tx_records",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tx_record_mode).toBe("incoming");
  });
});

describe("putting goods in the cart", () => {
  test("a scan adds the listing, prices it and clears the bar", async () => {
    renderTill("pos");
    const cartId = await ready();

    await scanInto(cartId, "Kopi");

    expect(grand()).toBe("Rp10.000");
    await flushTill();
    const listing = queryOne<{ tx_listing_qty: number; tx_listing_price: number }>(
      db,
      "SELECT tx_listing_qty, tx_listing_price FROM tx_listings WHERE tx_record_id = ?",
      [cartId],
    );
    expect(listing?.tx_listing_qty).toBe(1);
    expect(listing?.tx_listing_price).toBe(10_000);
  });

  test("scanning the same goods bumps the line instead of adding a second", async () => {
    renderTill("pos");
    await ready();

    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));
    await scan("Kopi");

    await waitFor(() => expect(grand()).toBe("Rp20.000"));
    expect(lines()).toHaveLength(1);
    await flushTill();
    expect(
      queryOne<{ qty: number }>(db, "SELECT tx_listing_qty AS qty FROM tx_listings")?.qty,
    ).toBe(2);
  });

  test("the quantity arrow bumps the line and the total", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    fireEvent.click(screen.getByTitle("Tambah"));

    await waitFor(() => expect(grand()).toBe("Rp20.000"));
    await flushTill();
    expect(
      queryOne<{ qty: number }>(db, "SELECT tx_listing_qty AS qty FROM tx_listings")?.qty,
    ).toBe(2);
  });

  test("an unknown query says so and adds nothing", async () => {
    renderTill("pos");
    await ready();

    fireEvent.change(screen.getByPlaceholderText(/Cari barang/i), {
      target: { value: "tidak-ada-barang-ini" },
    });

    expect(await screen.findByText("Tidak ada listing.")).toBeDefined();
    expect(grand()).toBe("Rp0");
    expect(lines()).toHaveLength(0);
  });

  test("a manual line keeps Bayar closed until it has a name", async () => {
    renderTill("pos");
    const cartId = await ready();

    fireEvent.click(screen.getByRole("button", { name: /Manual/ }));
    await waitFor(() => expect(lines()).toHaveLength(1));
    await setTender("incoming", 10_000);
    await waitFor(() => expect(lines()).toHaveLength(1));

    // No name and no catalogue link: the line's own issue is a hard one.
    expect((bayar() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Nama barang harus diisi")).toBeDefined();

    // Name it through the grid: the name cell opens its editor on a double click.
    fireEvent.doubleClick(screen.getByText("Nama"));
    const name = document.querySelector<HTMLInputElement>('input[placeholder="Nama barang"]');
    expect(name).not.toBeNull();
    fireEvent.change(name as HTMLInputElement, { target: { value: "Jasa bungkus" } });
    fireEvent.keyDown(name as HTMLInputElement, { key: "Enter" });

    // A named manual line still needs a price: a zero total is nothing to pay.
    let draft = (await openDrafts("incoming"))[0];
    await waitFor(async () => {
      await flushTill();
      [draft] = await openDrafts("incoming");
      expect(draft.listings[0]?.name).toBe("Jasa bungkus");
    });
    await Effect.runPromise(
      tillService().transaction.listings.set(
        draft.id,
        draft.listings.map((line) => ({ ...line, price: 10_000 })),
      ),
    );

    await waitFor(() => expect(grand()).toBe("Rp10.000"));
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    await flushTill();
    expect(
      queryOne<{ name: string }>(db, "SELECT tx_listing_name AS name FROM tx_listings WHERE tx_record_id = ?", [
        cartId,
      ])?.name,
    ).toBe("Jasa bungkus");
  });
});

/**
 * The undo in a cell reverts to what the *catalog* held. That origin is UI-only
 * state — `DraftListing.base` has no column behind it — so a draft read back from
 * SQLite arrives without it, and every undo button was gone for good.
 */
describe("a line that came back without its catalog origin", () => {
  test("gets its undo back, read from the catalog", async () => {
    renderTill("pos");
    const cartId = await ready();
    const kopi = await catalogListing("Kopi");

    // What the row looks like after a reload: the line is intact, its price is the
    // edited one, and nothing remembers the catalog's 10.000.
    await act(async () => {
      await Effect.runPromise(
        tillService().transaction.listings.set(cartId, [
          {
            id: "line-1",
            listingId: kopi.id,
            name: "Kopi",
            code: kopi.code ?? "",
            kind: kopi.kind,
            unit: kopi.unit,
            price: 12_000,
            qty: 1,
            discounts: [],
          },
        ]),
      );
    });
    await waitFor(() => expect(lines()).toHaveLength(1));

    const cell = document.getElementById("cell-line-1-price");
    expect(cell).not.toBeNull();
    fireEvent.doubleClick(cell as HTMLElement);

    // The undo is only offered when there is something to go back to, so its
    // presence is the base having been read back.
    await waitFor(() => expect(screen.queryByLabelText("Batalkan perubahan")).not.toBeNull());

    fireEvent.click(screen.getByLabelText("Batalkan perubahan"));
    await waitFor(() => expect(grand()).toBe("Rp10.000"));
  });
});

describe("the payment strip", () => {
  test("the inline amount editor writes the tender", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    await setTender("incoming", 0);
    await waitFor(() => expect(document.getElementById("cell-payment-amount")).not.toBeNull());
    await typeInlineTender(10_000);

    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    await flushTill();
    expect(
      queryOne<{ pay: number }>(db, "SELECT record_method_pay AS pay FROM record_methods"),
    ).toBeNull();
    // Still a draft: the tender is on tx_methods until Bayar commits it.
    expect(
      queryOne<{ v: number }>(db, "SELECT tx_method_value AS v FROM tx_methods")?.v,
    ).toBe(10_000);
  });

  test("an underpaid tender keeps Bayar disabled and writes nothing", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    await setTender("incoming", 5_000);

    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(bayar());
    await flushTill();
    expect(queryAll(db, "SELECT record_id FROM records")).toHaveLength(0);
  });

  test("a split tender writes two method rows and the change", async () => {
    renderTill("pos");
    const cartId = await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    await Effect.runPromise(
      tillService().transaction.methods.set(cartId, [
        { id: "m-cash", methodId: "1000", value: 6_000 },
        { id: "m-qris", methodId: "1003", value: 5_000 },
      ]),
    );
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(bayar());

    expect(await screen.findByRole("heading", { name: "Pembayaran berhasil" })).toBeDefined();
    await flushTill();
    await waitFor(() =>
      expect(
        queryAll(db, "SELECT record_method_id FROM record_methods").length,
      ).toBe(2),
    );
    const record = queryOne<{ pay: number }>(db, "SELECT record_pay AS pay FROM records");
    expect(record?.pay).toBe(11_000);
  });
});

describe("committing a sale", () => {
  test("Bayar writes the record, moves stock and leaves no cart behind", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));
    await setTender("incoming", 10_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(bayar());

    expect(await screen.findByRole("heading", { name: "Pembayaran berhasil" })).toBeDefined();
    await flushTill();
    await waitFor(() => expect(queryAll(db, "SELECT record_id FROM records")).toHaveLength(1));

    const record = queryOne<{
      mode: string;
      total: number;
      pay: number;
      paid_at: number | null;
      credit_at: number | null;
      cashier: string;
      flag: number;
    }>(
      db,
      `SELECT record_mode AS mode, record_total AS total, record_pay AS pay,
              record_paid_at AS paid_at, record_credit_at AS credit_at,
              record_cashier AS cashier, record_flag AS flag
         FROM records`,
    );
    expect(record).toEqual({
      mode: "incoming",
      total: 10_000,
      pay: 10_000,
      paid_at: expect.any(Number),
      credit_at: null,
      cashier: "Raisya",
      flag: 0,
    });

    // The line is snapshotted on the record, and the cart is gone.
    const line = queryOne<{ name: string; qty: number; total: number; price: number }>(
      db,
      "SELECT record_listing_name AS name, record_listing_qty AS qty, record_listing_total AS total, record_listing_price AS price FROM record_listings",
    );
    expect(line).toEqual({ name: "Kopi", qty: 1, total: 10_000, price: 10_000 });

    const stock = queryOne<{ value: number }>(
      db,
      `SELECT s.stock_value AS value FROM stocks s
         JOIN products p ON p.product_id = s.product_id
        WHERE p.product_name = 'Kopi'`,
    );
    expect(stock?.value).toBe(14);
    expect(
      queryOne<{ delta: number }>(
        db,
        "SELECT product_event_value AS delta FROM product_events ORDER BY product_event_created_at DESC LIMIT 1",
      )?.delta,
    ).toBe(-1);

    await flushTill();
    await waitFor(() => expect(queryAll(db, "SELECT tx_record_id FROM tx_records")).toHaveLength(0));
  });

  test("an extra charge is added to the total and snapshotted on the record", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    // The sale's stage toggle: goods → charges.
    fireEvent.click(screen.getByRole("button", { name: /Tambahan/ }));
    fireEvent.change(screen.getByPlaceholderText("Cari biaya tambahan..."), {
      target: { value: "Ongkir" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Ongkir/ }));

    await waitFor(() => expect(grand()).toBe("Rp12.000"));
    await setTender("incoming", 12_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bayar());

    expect(await screen.findByRole("heading", { name: "Pembayaran berhasil" })).toBeDefined();
    await flushTill();
    await waitFor(() =>
      expect(
        queryOne<{ name: string; eff: number }>(
          db,
          "SELECT record_extra_name AS name, record_extra_eff AS eff FROM record_extras",
        ),
      ).toEqual({ name: "Ongkir", eff: 2_000 }),
    );
    expect(queryOne<{ total: number }>(db, "SELECT record_total AS total FROM records")?.total).toBe(
      12_000,
    );
  });
});

describe("carts and tabs", () => {
  test("F12 opens a second tab, and Ctrl+Arrow walks the open carts", async () => {
    renderTill("pos");
    await ready();

    fireEvent.keyDown(document.body, { key: "F12" });

    await waitFor(() => expect(tabs()).toHaveLength(2));
    await waitFor(() => expect(tabs()[1].getAttribute("aria-selected")).toBe("true"));

    fireEvent.keyDown(document.body, { key: "ArrowLeft", ctrlKey: true });

    await waitFor(() => expect(tabs()[0].getAttribute("aria-selected")).toBe("true"));
  });

  test("the options dialog writes the sale's note to the draft", async () => {
    renderTill("pos");
    const cartId = await ready();

    fireEvent.click(screen.getByLabelText("Opsi transaksi"));
    const note = await screen.findByPlaceholderText("Catatan penjualan...");
    fireEvent.change(note, { target: { value: "titip ke Bu Sari" } });

    await waitFor(async () => {
      await flushTill();
      expect(
        queryOne<{ note: string }>(
          db,
          "SELECT tx_record_note AS note FROM tx_records WHERE tx_record_id = ?",
          [cartId],
        )?.note,
      ).toBe("titip ke Bu Sari");
    });
  });

  test("parking a cart keeps the row and gives the till a fresh tab", async () => {
    renderTill("pos");
    await ready();

    fireEvent.click(screen.getByLabelText("Opsi transaksi"));
    fireEvent.click(await screen.findByRole("button", { name: "Simpan keranjang" }));

    await waitFor(async () => {
      await flushTill();
      expect(queryAll(db, "SELECT tx_record_id, tx_record_flag AS flag FROM tx_records")).toHaveLength(2);
    });
    const rows = queryAll<{ flag: number }>(db, "SELECT tx_record_flag AS flag FROM tx_records ORDER BY tx_record_order");
    // The parked cart carries STORED_FLAG; the new active one does not.
    expect(rows.map((row) => row.flag).sort()).toEqual([0, 1]);
    // The strip keeps the parked cart as a number-only chip, plus the fresh tab.
    await waitFor(() => expect(tabs()).toHaveLength(2));
    expect(tabs().filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(1);
  });

  test("Batalkan rewinds a committed sale into a draft and puts the stock back", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));
    await setTender("incoming", 10_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bayar());
    expect(await screen.findByRole("heading", { name: "Pembayaran berhasil" })).toBeDefined();
    await flushTill();

    fireEvent.click(screen.getByRole("button", { name: "Batalkan" }));

    await waitFor(async () => {
      await flushTill();
      // The sale is gone from the live set, its stock movement reversed, and the
      // goods are back in an open cart.
      expect(
        queryAll(db, "SELECT record_id FROM records WHERE record_deleted_at IS NULL"),
      ).toHaveLength(0);
      expect(
        queryOne<{ value: number }>(
          db,
          `SELECT SUM(s.stock_value) AS value FROM stocks s
             JOIN products p ON p.product_id = s.product_id
            WHERE p.product_name = 'Kopi'`,
        )?.value,
      ).toBe(15);
      expect(queryAll(db, "SELECT tx_record_id FROM tx_records")).toHaveLength(1);
    });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Pembayaran berhasil" })).toBeNull());
  });

  test("a dual extra commits the extras-only twin in the same transaction", async () => {
    renderTill("pos");
    await ready();
    await scan("Kopi");
    await waitFor(() => expect(grand()).toBe("Rp10.000"));

    fireEvent.click(screen.getByRole("button", { name: /Tambahan/ }));
    fireEvent.change(screen.getByPlaceholderText("Cari biaya tambahan..."), {
      target: { value: "Service" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Service/ }));
    await waitFor(() => expect(grand()).toBe("Rp13.000"));

    await setTender("incoming", 13_000);
    await waitFor(() => expect((bayar() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bayar());
    expect(await screen.findByRole("heading", { name: "Pembayaran berhasil" })).toBeDefined();
    await flushTill();

    const records = queryAll<{
      id: string;
      mode: string;
      flag: number;
      pair: string | null;
      total: number;
    }>(
      db,
      `SELECT record_id AS id, record_mode AS mode, record_flag AS flag,
              record_pair_id AS pair, record_total AS total
         FROM records WHERE record_deleted_at IS NULL ORDER BY record_mode`,
    );
    expect(records).toHaveLength(2);
    const sale = records.find((record) => record.mode === "incoming");
    const twin = records.find((record) => record.mode === "outcoming");
    if (sale === undefined || twin === undefined) throw new Error("the twin was not written");
    expect(twin.mode).toBe("outcoming");
    expect(twin.flag & 1).toBe(1);
    expect(twin.total).toBe(3_000);
    expect(sale.mode).toBe("incoming");
    expect(sale.total).toBe(13_000);
    // Both sides name each other.
    expect(sale.pair).toBe(twin.id);
    expect(twin.pair).toBe(sale.id);
    // And the twin carries the charge as its only line.
    expect(
      queryAll<{ id: string }>(db, "SELECT record_extra_id AS id FROM record_extras WHERE record_id = ?", [
        twin.id,
      ]),
    ).toHaveLength(1);
  });
});
