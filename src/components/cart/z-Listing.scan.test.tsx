import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * The barcode path through the goods search.
 *
 * A scanner types the code and sends its Enter in one burst, so Enter always
 * lands before the debounced search has run. The search field also cannot pick
 * from the list it is showing at that moment: the list still belongs to the
 * previous query (or to none), and adding from it puts the wrong goods in the
 * cart — which is exactly what an audit fix once did, by making that Enter only
 * refresh the query and wait for a *second* press. A scan then added nothing at
 * all and the cashier had to press Enter by hand.
 *
 * The pick is armed instead: the text is adopted, and the best match is taken as
 * soon as the results for it land. These tests drive the real grid through a
 * stubbed catalogue and never fake a timer — the debounce is skipped by cancel,
 * which is what Enter does.
 */
const catalogue: Listing[] = [
  {
    id: "l1",
    productId: "p1",
    name: "Kopi Susu",
    price: 10_000,
    unit: 1,
    kind: "retail",
    code: "899123",
    cover: null,
    stock: 10,
    productName: "Kopi",
    altNames: [],
  },
  {
    id: "l2",
    productId: "p2",
    name: "Teh Manis",
    price: 5_000,
    unit: 1,
    kind: "retail",
    code: "899456",
    cover: null,
    stock: 10,
    productName: "Teh",
    altNames: [],
  },
];

/** The service's shape for this screen: `search` resolves to an Effect. */
const searches: string[] = [];
mock.module("~/services", () => ({
  service: {
    listing: {
      get: {
        search: (query: string) => {
          searches.push(query);
          if (query.trim() === "") return Effect.succeed(catalogue);
          const needle = query.trim().toLowerCase();
          return Effect.succeed(
            catalogue.filter(
              (listing) =>
                listing.code === query.trim() ||
                listing.name.toLowerCase().includes(needle),
            ),
          );
        },
      },
    },
  },
}));

const { Listing: Goods } = await import("./z-Listing");

function Harness({ writes }: { writes: Line[][] }) {
  const [lines, setLines] = useState<Line[]>([]);
  return (
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
  );
}

function renderGrid() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
  return { writes, search };
}

/** What a barcode gun does: the code, then Enter, with no pause in between. */
function scan(search: HTMLInputElement, code: string) {
  fireEvent.change(search, { target: { value: code } });
  fireEvent.keyDown(search, { key: "Enter" });
}

describe("goods search, scanned code", () => {
  test("a scan adds the listing without a second Enter", async () => {
    const { writes, search } = renderGrid();

    scan(search, "899123");

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.map((line) => line.name)).toEqual(["Kopi Susu"]);
    expect(writes[0]?.[0]?.listingId).toBe("l1");
    // The field clears for the next item; the cashier keeps scanning.
    await waitFor(() => expect(search.value).toBe(""));
  });

  test("a code that matches no listing adds nothing", async () => {
    const { writes, search } = renderGrid();

    scan(search, "000000");

    await waitFor(() => expect(searches.at(-1)).toBe("000000"));
    expect(writes).toHaveLength(0);
  });

  test("Enter never picks from the list the previous query left behind", async () => {
    const { writes, search } = renderGrid();

    // The catalogue is on screen for the empty query; "zzz" matches nothing.
    await waitFor(() => expect(searches.at(-1)).toBe(""));
    scan(search, "zzz");

    await waitFor(() => expect(searches.at(-1)).toBe("zzz"));
    expect(writes).toHaveLength(0);
  });

  test("a full code typed by hand needs no Enter — the pause takes it", async () => {
    const { writes, search } = renderGrid();

    fireEvent.change(search, { target: { value: "899456" } });

    // The pause passes; an exact code is the whole answer, so it is the goods.
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.[0]?.listingId).toBe("l2");
    await waitFor(() => expect(search.value).toBe(""));

    // And the scan's own Enter, arriving late, adds no second line.
    fireEvent.keyDown(search, { key: "Enter" });
    expect(writes).toHaveLength(1);
  });

  test("the exact code wins over a name match, case-insensitively", async () => {
    const { writes, search } = renderGrid();

    scan(search, "teh");

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.[0]?.name).toBe("Teh Manis");
  });

  test("a second scan of the same listing bumps its quantity, not a new line", async () => {
    const { writes, search } = renderGrid();

    scan(search, "899123");
    await waitFor(() => expect(writes).toHaveLength(1));

    scan(search, "899123");
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]).toHaveLength(1);
    expect(writes[1]?.[0]?.qty).toBe(2);
  });

  test("taking a buried listing again moves it to the top with the bump", async () => {
    const { writes, search } = renderGrid();

    // Two lines, so the first one is no longer at the top.
    scan(search, "899123");
    await waitFor(() => expect(writes).toHaveLength(1));
    scan(search, "899456");
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.map((line) => line.name)).toEqual(["Teh Manis", "Kopi Susu"]);

    // Scanning the buried one brings it back to the top, qty bumped.
    scan(search, "899123");
    await waitFor(() => expect(writes).toHaveLength(3));
    expect(writes[2]?.map((line) => line.name)).toEqual(["Kopi Susu", "Teh Manis"]);
    expect(writes[2]?.[0]?.qty).toBe(2);
    // Position is the animation's business; the state has to be right either way.
    expect(writes[2]?.[1]?.qty).toBe(1);
  });
});
