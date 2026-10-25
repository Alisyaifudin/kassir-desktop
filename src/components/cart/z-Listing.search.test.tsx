import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * When the results pane may cover the cards.
 *
 * Typing in the search bar used to blank the grid on the first character, which
 * left a hole where the cart was for as long as the pause lasted — and the pause
 * is deliberate (`SEARCH_DELAY`), because a search per keystroke rebuilt a
 * catalogue-sized index. So the cards stay until there is something to show in
 * their place: the pause is over and the search for the text on screen has
 * answered. From then on the pane keeps the floor while there is text, so
 * narrowing a query does not flash the grid back between keystrokes.
 *
 * A scan is the exception the shape of the answer decides: an exact code needs
 * no list, so it is taken and the bar handed back empty — the grid never steps
 * aside for a barcode.
 *
 * The pane itself is a virtualized grid that measures its container, which is
 * not what these tests are about; it stands in as a marker. Its own timing is
 * driven with real sleeps rather than `waitFor`, which kept the pane's
 * measurement loop spinning long enough to abort the runner.
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
];

mock.module("~/components/cart/z-SearchResults", () => ({
  SearchResults: () => <div data-testid="results-pane" />,
}));

mock.module("~/services", () => ({
  service: {
    // A fresh array per answer, as the real search builds one: `useQuery` hands
    // back whatever the stream emits, and the list is tracked by identity.
    listing: { get: { search: () => Effect.sync(() => [...catalogue]) } },
  },
}));

const { Listing: Goods } = await import("./z-Listing");

/** Past the debounce, with room for the search to answer and the pane to paint. */
const PAUSE = 400;

function pause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, PAUSE));
}

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

/** A cart with one line, the search bar, and a way to see what is on the floor. */
async function renderWithLine() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
  fireEvent.change(search, { target: { value: "899123" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => expect(writes).toHaveLength(1));
  const line = writes[0]?.[0];
  if (line === undefined) throw new Error("no line");
  return {
    search,
    writes,
    /** The price cell of the cart's line — `null` while the pane covers it. */
    card: () => document.getElementById(`cell-${line.id}-price`),
    pane: () => screen.queryByTestId("results-pane"),
  };
}

describe("the results pane waits for the results", () => {
  test("the cards stay while the query is still inside its pause", async () => {
    const { search, card, pane } = await renderWithLine();
    expect(card()).not.toBeNull();

    fireEvent.change(search, { target: { value: "kop" } });

    // Nothing has been searched yet: the cards are what there is to show.
    expect(card()).not.toBeNull();
    expect(pane()).toBeNull();

    // Once the search for that text has answered, they make way.
    await pause();
    expect(pane()).not.toBeNull();
    expect(card()).toBeNull();
  });

  test("a longer query does not flash the cards back", async () => {
    const { search, card, pane } = await renderWithLine();

    fireEvent.change(search, { target: { value: "kop" } });
    await pause();
    expect(pane()).not.toBeNull();

    // The pane is up; narrowing it is the pane's business, not the grid's.
    fireEvent.change(search, { target: { value: "kopi" } });
    expect(pane()).not.toBeNull();
    expect(card()).toBeNull();
  });

  test("clearing the bar brings the cards straight back", async () => {
    const { search, card, pane } = await renderWithLine();

    fireEvent.change(search, { target: { value: "kop" } });
    await pause();
    expect(pane()).not.toBeNull();

    fireEvent.change(search, { target: { value: "" } });
    expect(pane()).toBeNull();
    expect(card()).not.toBeNull();
  });

  test("a scan of an exact code adds it without the pane ever showing", async () => {
    const writes: Line[][] = [];
    render(<Harness writes={writes} />);
    const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;

    // One burst, as a barcode gun types it: the code and its Enter, no pause.
    fireEvent.change(search, { target: { value: "899123" } });
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => expect(writes).toHaveLength(1));
    await pause();
    expect(screen.queryByTestId("results-pane")).toBeNull();
    expect(search.value).toBe("");
  });
});
