import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { ProductFull } from "~/services/product";
import type { Line } from "./types";

/**
 * The number cell opens the product behind the line, read-only.
 *
 * The cart only carries what it sells from: a name, a price, a quantity. The
 * question a cashier asks at the till — "which one is this, and what else do we
 * have of it?" — is answered by the catalogue row, so the number cell opens a
 * sheet with the product's other listings, its properties, its stock lots and
 * its note. Nothing in it writes: the one way out to editing is the footer link.
 */
const listing: Listing = {
  id: "l1",
  productId: "p1",
  name: "Kopi Susu 250ml",
  price: 10_000,
  unit: 1,
  kind: "retail",
  code: "899123",
  cover: null,
  stock: 10,
  productName: "Kopi Susu",
  altNames: [],
};

const product: ProductFull = {
  id: "p1",
  name: "Kopi Susu",
  note: "Gula aren, tanpa susu kental.",
  flag: 0,
  altNames: ["Kopi Susu Gula Aren"],
  listings: [
    {
      id: "l1",
      productId: "p1",
      name: "Kopi Susu 250ml",
      price: 10_000,
      unit: 1,
      kind: "retail",
      code: "899123",
      updatedAt: 0,
      syncAt: null,
    },
    {
      id: "l2",
      productId: "p1",
      name: "Kopi Susu 1L",
      price: 36_000,
      unit: 4,
      kind: "grosir",
      code: null,
      updatedAt: 0,
      syncAt: null,
    },
  ],
  stock: 10,
  capital: 8_000,
  maxCapital: 9_000,
  cover: null,
  updatedAt: 0,
  syncAt: null,
  stocks: [
    {
      id: "s1",
      productId: "p1",
      value: 6,
      capital: 8_000,
      createdAt: 1_700_000_000_000,
      updatedAt: 0,
    },
    {
      id: "s2",
      productId: "p1",
      value: 4,
      capital: 9_000,
      createdAt: 1_700_100_000_000,
      updatedAt: 0,
    },
  ],
  properties: [
    { id: "pr1", productId: "p1", key: "asal", value: "Gayo", updatedAt: 0, syncAt: null },
  ],
  productNames: [],
  images: [],
  categoryIds: [],
};

// The read the sheet makes is recorded, and one test holds it open so the
// skeleton is observable: a lazy fetch has to show something in the moment it is
// still running.
const reads: string[] = [];
let held: Promise<void> | null = null;
let release: (() => void) | null = null;

mock.module("~/services", () => ({
  service: {
    listing: {
      get: {
        search: () => Effect.succeed([listing]),
        all: () => Effect.succeed([listing]),
      },
    },
    product: {
      get: {
        byId: (id: string) => {
          reads.push(`id:${id}`);
          return Effect.succeed(product);
        },
        byListing: (id: string) => {
          reads.push(`listing:${id}`);
          const wait = held;
          return wait === null
            ? Effect.succeed(product)
            : Effect.flatMap(Effect.promise(() => wait), () => Effect.succeed(product));
        },
      },
    },
  },
}));

const { Listing: Goods } = await import("./z-Listing");

function Harness({ writes, initial = [] }: { writes: Line[][]; initial?: Line[] }) {
  const [lines, setLines] = useState<Line[]>(initial);
  return (
    <MemoryRouter>
      <Goods
        mode="sale"
        lines={lines}
        issues={new Map()}
        onChange={(next) => {
          writes.push(next);
          setLines(next);
        }}
        focusSearch={0}
        focused
        onActivate={() => {}}
      />
    </MemoryRouter>
  );
}

/** One line taken from the search, and the number cell that opened it. */
async function openSheet() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari barang atau kombo untuk dijual...") as HTMLInputElement;
  fireEvent.change(search, { target: { value: "899123" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => expect(writes).toHaveLength(1));
  const line = writes[0]?.[0];
  if (line === undefined) throw new Error("no line");

  const cell = document.getElementById(`cell-${line.id}-no`);
  fireEvent.click(cell as HTMLElement);
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  return line;
}

describe("the product sheet", () => {
  test("reads the product behind the line: listings, properties, lots, note", async () => {
    await openSheet();

    await screen.findByText("Kopi Susu 1L");
    expect(screen.getByText("Kopi Susu")).toBeTruthy();
    // The listing this line is holding is marked in the list.
    expect(screen.getByText("Di keranjang")).toBeTruthy();
    expect(screen.getByText("Gayo")).toBeTruthy();
    expect(screen.getByText("Lot 1")).toBeTruthy();
    expect(screen.getByText("Lot 2")).toBeTruthy();
    expect(screen.getByText("Gula aren, tanpa susu kental.")).toBeTruthy();
  });

  test("the way out is a link to the product", async () => {
    await openSheet();

    const link = await screen.findByRole("link", { name: /Buka detail produk/ });
    // The way back is the app's own history now, not a `url_back` the cart had to
    // hand over: the product is pushed onto the stack, so `Back` returns here.
    expect(link.getAttribute("href")).toBe("/products/p1");
  });
});

/**
 * A cart copied out of a saved record ("Jadikan Transaksi").
 *
 * The copy is built from `record_listings`: the listing it sold, its name, its
 * unit and the price that was actually paid — and no product id, because that is
 * UI state with no column behind it. The number cell used to demand a product id
 * and so did nothing at all here. It now asks the catalogue for the product of
 * the listing it holds, on the click.
 */
const copied: Line = {
  id: "line-1",
  listingId: "l1",
  name: "Kopi Susu 250ml",
  code: "899123",
  unit: 1,
  price: 10_000,
  qty: 1,
  discounts: [{ id: "d1", value: 0, kind: "percent", eff: 0, total: 0 }],
  // The snapshot the copy carries, which is also why the grid's own restore does
  // not step in and fill the product id in.
  base: { name: "Kopi Susu 250ml", code: "899123", unit: 1, price: 10_000 },
};

function copiedCell(): HTMLElement {
  const cell = document.getElementById("cell-line-1-no");
  if (cell === null) throw new Error("no number cell");
  return cell;
}

describe("the product sheet on a copied cart", () => {
  test("reads the product through the listing the line holds", async () => {
    reads.length = 0;
    held = null;
    render(<Harness writes={[]} initial={[copied]} />);

    // Nothing is read while the cart is just sitting there.
    expect(reads).toEqual([]);
    fireEvent.click(copiedCell());

    await screen.findByText("Kopi Susu 1L");
    expect(reads).toEqual(["listing:l1"]);
    // The listing the copy is holding is the one the sheet marks.
    expect(screen.getByText("Di keranjang")).toBeTruthy();
  });

  test("shows a skeleton while the read is on its way", async () => {
    held = new Promise<void>((resolve) => {
      release = resolve;
    });
    render(<Harness writes={[]} initial={[copied]} />);

    fireEvent.click(copiedCell());
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    // The sheet is up before the product is: a placeholder, never the sentence
    // that means the row is gone.
    expect(document.querySelectorAll('[data-slot="skeleton-text"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Produk tidak bisa dimuat.")).toBeNull();

    release?.();
    await screen.findByText("Kopi Susu 1L");
    expect(document.querySelectorAll('[data-slot="skeleton-text"]').length).toBe(0);
    held = null;
  });

  test("a hand-typed line still has nothing to open", async () => {
    render(
      <Harness
        writes={[]}
        initial={[{ ...copied, id: "manual-1", listingId: null, base: undefined }]}
      />,
    );

    fireEvent.click(document.getElementById("cell-manual-1-no") as HTMLElement);
    // Nothing was opened, and nothing is left in flight for the next test.
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
