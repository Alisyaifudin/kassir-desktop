import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
};

mock.module("~/services", () => ({
  service: {
    listing: {
      get: {
        search: () => Effect.succeed([listing]),
        all: () => Effect.succeed([listing]),
      },
    },
    product: { get: { byId: () => Effect.succeed(product) } },
  },
}));

const { Listing: Goods } = await import("./z-Listing");

function Harness({ writes }: { writes: Line[][] }) {
  const [lines, setLines] = useState<Line[]>([]);
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
  const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
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

  test("the way out is a link to the product, with a way back to this cart", async () => {
    await openSheet();

    const link = await screen.findByRole("link", { name: /Buka detail produk/ });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("/products/p1");
    expect(href).toContain("url_back=");
  });
});
