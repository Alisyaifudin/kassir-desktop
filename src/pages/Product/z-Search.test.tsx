import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Search } from "./z-Search";

/**
 * The product search takes the cursor as the page appears.
 *
 * Arriving on `/products` is almost always "find a product": without the focus
 * the first keystroke of every visit went nowhere and the operator clicked the bar
 * first. The Extra page's search has behaved this way for longer; this pins the
 * pair so neither can drift.
 */
describe("product search", () => {
  test("takes the cursor on mount, without a click", () => {
    render(<Search value="" onChange={() => {}} />);

    expect(document.activeElement).toBe(screen.getByPlaceholderText(/Cari produk/));
  });

  test("the cursor lands after navigation even with a query already in the URL", () => {
    render(<Search value="kopi" onChange={() => {}} />);

    const field = screen.getByPlaceholderText(/Cari produk/) as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    // Focus only: the existing query is left alone, ready to be edited or replaced
    // by the first keystroke (which types over nothing — it appends).
    expect(field.value).toBe("kopi");
  });

  test("typing reaches the caller after the pause", async () => {
    const changes: string[] = [];
    render(<Search value="" onChange={(next) => changes.push(next)} />);

    fireEvent.change(screen.getByPlaceholderText(/Cari produk/), { target: { value: "k" } });

    await waitFor(() => expect(changes).toEqual(["k"]));
  });
});
