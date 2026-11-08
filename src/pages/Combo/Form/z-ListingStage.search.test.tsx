import { describe, expect, mock, test } from "bun:test";
import { Effect } from "effect";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Listing } from "~/services/listing";

const searchCalls: string[] = [];
const catalogResult: Listing = {
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
  altNames: ["coffee"],
};

mock.module("~/components/cart/z-SearchResults", () => ({
  SearchResults: ({ res, onPick }: { res: { type: string; data?: { kind: "listing"; listing: Listing }[] }; onPick: (hit: { kind: "listing"; listing: Listing }) => void }) => (
    <div data-testid="search-grid">
      {res.type === "success" ? res.data?.map((hit) => (
        <button key={hit.listing.id} type="button" onClick={() => onPick(hit)}>
          {hit.listing.name}
        </button>
      )) : null}
    </div>
  ),
}));

mock.module("~/services", () => ({
  service: {
    listing: {
      get: {
        search: (query: string) => Effect.sync(() => {
          searchCalls.push(query);
          return query.toLowerCase().includes("kop") ? [catalogResult] : [];
        }),
      },
    },
  },
}));

const { ListingStage } = await import("./z-ListingStage");

function harness(onAdd = mock(() => {})) {
  return {
    onAdd,
    ...render(
      <ListingStage
        listings={[]}
        components={[]}
        onAdd={onAdd}
        onQuantityChange={() => {}}
        onQuantityCommit={() => {}}
        onDiscountsChange={() => {}}
        onRemove={() => {}}
        onReorder={() => {}}
        onNext={() => {}}
        extraCount={0}
      />,
    ),
  };
}

describe("combo listing search", () => {
  test("debounces the listing-service query and passes matching hits to the POS results grid", async () => {
    searchCalls.length = 0;
    const { onAdd } = harness();
    const field = screen.getByPlaceholderText("Cari listing...") as HTMLInputElement;

    fireEvent.change(field, { target: { value: "kop" } });
    expect(searchCalls).toEqual([]);
    expect(screen.queryByTestId("search-grid")).toBeNull();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    const result = screen.getByTestId("search-grid");
    expect(searchCalls).toEqual(["kop"]);
    expect(result.textContent).toContain("Kopi susu");
    expect(result.textContent).not.toContain("listing lain");

    fireEvent.click(screen.getByRole("button", { name: "Kopi susu" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(onAdd).toHaveBeenCalledWith("listing-coffee");
    expect(field.value).toBe("");
  });
});
