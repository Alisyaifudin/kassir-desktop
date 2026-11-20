import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * Enter on an alternative name, when more than one product answers to it.
 *
 * The alias is how a lazy barcode gets recorded: the producer prints one code for
 * two different goods, so the second product carries it as an alternative name
 * while the first still holds it as its own code. Enter used to take the first
 * result, which is the wrong product half the time — and the till has no way of
 * knowing which of the two is on the counter. So an exact identifier shared by
 * two *products* is not a match: the list stays up, the text stays in the bar,
 * and the operator picks.
 *
 * An alias carried by two listings of the *same* product is not that case: one
 * product in two units, and the first is still the answer Enter gives.
 */
function listing(over: Partial<Listing> & Pick<Listing, "id" | "productId" | "name">): Listing {
  return {
    price: 10_000,
    unit: 1,
    kind: "retail",
    code: null,
    cover: null,
    stock: 10,
    productName: over.name,
    altNames: [],
    ...over,
  };
}

const catalogue: Listing[] = [
  // One barcode, two products: `l1` has it as its code, `l2` as an alias.
  listing({ id: "l1", productId: "p1", name: "Kopi Susu", code: "899123" }),
  listing({ id: "l2", productId: "p2", name: "Kopi Aren", altNames: ["899123"] }),
  // Two aliases that are the same text on two products.
  listing({ id: "l3", productId: "p3", name: "Teh Manis", altNames: ["teh kotak"] }),
  listing({ id: "l4", productId: "p4", name: "Teh Tawar", altNames: ["teh kotak"] }),
  // One product, two units, one shared alias: still a single answer.
  listing({
    id: "l5",
    productId: "p5",
    name: "Susu Kental Manis",
    unit: 1,
    altNames: ["susu kaleng"],
  }),
  listing({
    id: "l6",
    productId: "p5",
    name: "Susu Kental Manis",
    unit: 6,
    altNames: ["susu kaleng"],
  }),
  // An alias only this product carries: Enter takes it, as it always has.
  listing({ id: "l7", productId: "p7", name: "Gula Aren", altNames: ["gula jawa"] }),
];

type Hit =
  | { kind: "listing"; listing: Listing }
  | { kind: "combo"; combo: { id: string; name: string } };

/** A stand-in for the virtualized pane: it measures its container, which jsdom cannot. */
mock.module("~/components/cart/z-SearchResults", () => ({
  SearchResults: ({
    res,
    onPick,
  }: {
    res: { type: string; data?: Hit[] };
    onPick: (hit: Hit) => void;
  }) => (
    <div data-testid="results-pane">
      {(res.type === "success" ? (res.data ?? []) : []).map((hit) =>
        hit.kind === "listing" ? (
          <button key={hit.listing.id} onClick={() => onPick(hit)}>
            {hit.listing.name}
          </button>
        ) : null,
      )}
    </div>
  ),
}));

mock.module("~/services", () => ({
  service: {
    listing: {
      get: {
        // What the index answers: code, name, product name and aliases.
        search: (query: string) =>
          Effect.sync(() => {
            const text = query.trim().toLowerCase();
            if (text === "") return [...catalogue];
            return catalogue.filter(
              (candidate) =>
                candidate.code?.toLowerCase() === text ||
                candidate.name.toLowerCase().includes(text) ||
                candidate.productName.toLowerCase().includes(text) ||
                candidate.altNames.some((altName) => altName.toLowerCase() === text),
            );
          }),
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
  const search = screen.getByPlaceholderText(
    "Cari barang atau kombo untuk dijual...",
  ) as HTMLInputElement;
  return { writes, search };
}

/** The text, then Enter: a scan's burst, and the same keys typed by hand. */
function submit(search: HTMLInputElement, text: string) {
  fireEvent.change(search, { target: { value: text } });
  fireEvent.keyDown(search, { key: "Enter" });
}

describe("goods search, an alias two products answer to", () => {
  test("Enter leaves the list up instead of taking the first product", async () => {
    const { writes, search } = renderGrid();

    submit(search, "teh kotak");

    // The results are in and the pane is up — that is the whole answer.
    await waitFor(() => expect(screen.getByTestId("results-pane")).toBeTruthy());
    expect(writes).toHaveLength(0);
    // The text stays, so the list stays: nothing was taken, nothing was cleared.
    expect(search.value).toBe("teh kotak");
  });

  test("a barcode one product holds and another carries as an alias is a choice too", async () => {
    const { writes, search } = renderGrid();

    submit(search, "899123");

    await waitFor(() => expect(screen.getByTestId("results-pane")).toBeTruthy());
    expect(writes).toHaveLength(0);
    expect(search.value).toBe("899123");
  });

  test("the operator picks from the list, and that product is added", async () => {
    const { writes, search } = renderGrid();

    submit(search, "teh kotak");
    await waitFor(() => expect(screen.getByTestId("results-pane")).toBeTruthy());

    // The second of the two, not the first one Enter used to take.
    const pane = screen.getByTestId("results-pane");
    const [, second] = within(pane).getAllByRole("button");
    fireEvent.click(second as HTMLElement);

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.map((line) => line.listingId)).toEqual(["l4"]);
    // Picking clears the bar for the next item, exactly as a scan leaves it.
    await waitFor(() => expect(search.value).toBe(""));
  });

  test("an alias one product carries is still taken on Enter", async () => {
    const { writes, search } = renderGrid();

    submit(search, "gula jawa");

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.[0]?.listingId).toBe("l7");
    await waitFor(() => expect(search.value).toBe(""));
  });

  test("two units of one product sharing an alias are not a choice", async () => {
    const { writes, search } = renderGrid();

    submit(search, "susu kaleng");

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.[0]?.listingId).toBe("l5");
    await waitFor(() => expect(search.value).toBe(""));
  });
});
