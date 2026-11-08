import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";

const coffee: Listing = {
  id: "listing-coffee",
  productId: "product-coffee",
  name: "Kopi susu",
  price: 12000,
  unit: 1,
  kind: "retail",
  code: "KOPI1",
  cover: null,
  stock: 10,
  productName: "Kopi",
  altNames: [],
};

mock.module("~/services", () => ({
  service: {
    listing: {
      get: { search: () => Effect.sync(() => []) },
    },
  },
}));

const { ListingStage } = await import("./z-ListingStage");

describe("combo listing row cells", () => {
  test("Enter in the quantity editor commits without submitting the form", () => {
    let submitted = false;
    const written: number[] = [];
    render(
      <form onSubmit={() => { submitted = true; }}>
        <ListingStage
          listings={[coffee]}
          components={[{ listingId: coffee.id, quantity: 1, discounts: [] }]}
          onAdd={() => {}}
          onQuantityChange={(_, quantity) => written.push(quantity)}
          onQuantityCommit={(_, quantity) => written.push(quantity)}
          onDiscountsChange={() => {}}
          onRemove={() => {}}
          onReorder={() => {}}
          onNext={() => {}}
          extraCount={0}
        />
      </form>,
    );

    const cell = document.getElementById(`cell-${coffee.id}-qty`)!;
    fireEvent.click(cell);
    const editor = cell.querySelector("input")!;
    fireEvent.change(editor, { target: { value: "3" } });
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(submitted).toBe(false);
    expect(written.at(-1)).toBe(3);
  });

  test("a cell click opens its editor and Enter commits the quantity", () => {
    const written: number[] = [];
    render(
      <ListingStage
        listings={[coffee]}
        components={[{ listingId: coffee.id, quantity: 1, discounts: [] }]}
        onAdd={() => {}}
        onQuantityChange={(_, quantity) => written.push(quantity)}
        onQuantityCommit={(_, quantity) => written.push(quantity)}
        onDiscountsChange={() => {}}
        onRemove={() => {}}
        onReorder={() => {}}
        onNext={() => {}}
        extraCount={0}
      />,
    );

    const cell = document.getElementById(`cell-${coffee.id}-qty`);
    expect(cell).not.toBeNull();
    fireEvent.click(cell!);

    const editor = cell!.querySelector("input");
    expect(editor).not.toBeNull();
    fireEvent.change(editor!, { target: { value: "3" } });
    fireEvent.keyDown(editor!, { key: "Enter" });
    expect(written.at(-1)).toBe(3);
  });

  test("a component's discount stack reduces its line total and the grand total", () => {
    render(
      <ListingStage
        listings={[coffee]}
        components={[
          {
            listingId: coffee.id,
            quantity: 2,
            discounts: [{ id: "d1", value: 10, kind: "percent" }],
          },
        ]}
        onAdd={() => {}}
        onQuantityChange={() => {}}
        onQuantityCommit={() => {}}
        onDiscountsChange={() => {}}
        onRemove={() => {}}
        onReorder={() => {}}
        onNext={() => {}}
        extraCount={0}
      />,
    );

    const discountCell = document.getElementById(`cell-${coffee.id}-diskon`);
    const totalCell = document.getElementById(`cell-${coffee.id}-grandTotal`);
    expect(discountCell?.textContent).toContain("Diskon");
    expect(discountCell?.textContent).toContain("-Rp2.400");
    expect(totalCell?.textContent).toBe("Rp21.600");
  });

  test("typing a digit on the selected quantity cell replaces the value", async () => {
    const written: number[] = [];
    render(
      <ListingStage
        listings={[coffee]}
        components={[{ listingId: coffee.id, quantity: 4, discounts: [] }]}
        onAdd={() => {}}
        onQuantityChange={(_, quantity) => written.push(quantity)}
        onQuantityCommit={(_, quantity) => written.push(quantity)}
        onDiscountsChange={() => {}}
        onRemove={() => {}}
        onReorder={() => {}}
        onNext={() => {}}
        extraCount={0}
      />,
    );

    const grid = screen.getByRole("grid", { name: "Listing combo" });
    const cell = document.getElementById(`cell-${coffee.id}-qty`)!;
    fireEvent.click(cell);
    fireEvent.keyDown(cell.querySelector("input")!, { key: "Escape" });
    fireEvent.keyDown(grid, { key: "2" });
    await waitFor(() => expect(written.at(-1)).toBe(2));
  });
});
