import { afterAll, describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { ProductFull } from "~/services/product";
import type { Line } from "./types";

/**
 * The card's photo opens the product's gallery.
 *
 * A cart line carries one photo — the cover the search grid showed — so the sheet
 * has to ask for the rest. This is the seam between the two: the click, the read,
 * and the gallery arriving on the frame the card was already drawing.
 */
mock.module("~/lib/image", () => ({
  image: {
    load: (name: string) => Effect.succeed(`blob:${name}`),
    save: () => Effect.succeed(new ArrayBuffer(0)),
    del: () => Effect.succeed(undefined),
    size: () => Effect.succeed(0),
  },
}));

const cover = { name: "kopi-1.png", mime: "image/png" as const };

const listing: Listing = {
  id: "l1",
  productId: "p1",
  name: "Kopi Susu 250ml",
  price: 10_000,
  unit: 1,
  kind: "retail",
  code: "899123",
  cover,
  stock: 10,
  productName: "Kopi Susu",
  altNames: [],
};

const product: ProductFull = {
  id: "p1",
  name: "Kopi Susu",
  note: "",
  flag: 0,
  altNames: [],
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
  ],
  stock: 10,
  capital: 8_000,
  maxCapital: 9_000,
  cover: { id: "i1", productId: "p1", order: 0, ...cover, updatedAt: 0, syncAt: null },
  updatedAt: 0,
  syncAt: null,
  stocks: [],
  properties: [],
  productNames: [],
  images: [
    { id: "i1", productId: "p1", order: 0, ...cover, updatedAt: 0, syncAt: null },
    {
      id: "i2",
      productId: "p1",
      order: 1,
      name: "kopi-2.png",
      mime: "image/png",
      updatedAt: 0,
      syncAt: null,
    },
  ],
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

afterAll(() => {
  mock.restore();
});

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

/** One line taken from the search, and the photo the card drew for it. */
async function openGallery() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
  fireEvent.change(search, { target: { value: "899123" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => expect(writes).toHaveLength(1));
  const line = writes[0]?.[0];
  if (line === undefined) throw new Error("no line");

  fireEvent.click(screen.getByTitle("Lihat gambar produk"));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  return line;
}

describe("the card's photo", () => {
  test("opens the product's gallery, on the cover the card shows", async () => {
    await openGallery();

    // The product's own name titles the sheet; the line only knows its listing.
    expect(await screen.findByText("Kopi Susu")).toBeTruthy();
    // Both photos, and the frame on the first — the one the thumbnail drew.
    expect(await screen.findByRole("button", { name: "Gambar 2" })).toBeTruthy();
    expect(await screen.findByAltText("Gambar 1 dari 2")).toBeTruthy();
  });

  test("the arrows walk the product's photos", async () => {
    await openGallery();

    const next = await screen.findByRole("button", { name: "Gambar berikutnya" });
    fireEvent.click(next);

    expect(await screen.findByAltText("Gambar 2 dari 2")).toBeTruthy();
  });

  test("clicking the photo does not move the cart's cursor", async () => {
    const writes: Line[][] = [];
    render(<Harness writes={writes} />);
    const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "899123" } });
    fireEvent.keyDown(search, { key: "Enter" });
    await waitFor(() => expect(writes).toHaveLength(1));
    const before = selectedCells();

    fireEvent.click(screen.getByTitle("Lihat gambar produk"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    // The photo sits outside the grid's rows, so the click leaves the cursor where
    // it was — and it is the gallery, not the detail sheet, that came up.
    expect(selectedCells()).toEqual(before);
    expect(screen.queryByText("Di keranjang")).toBeNull();
  });

  function selectedCells(): string[] {
    return [...document.querySelectorAll('[aria-selected="true"]')].map((cell) => cell.id);
  }
});
