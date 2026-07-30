import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Search } from "../z-Search";
import { render } from "~/lib/render";
import type { Product } from "~/services/product";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

function makeProduct(overrides?: Partial<Product>): Product {
  return {
    id: "1",
    name: "Indomie Goreng",
    price: 3500,
    note: "",
    codes: ["8998866200318"],
    capitals: [{ id: "c1", stock: 50, capital: 3000 }],
    ...overrides,
  };
}

const products: Product[] = [
  makeProduct({ id: "1", name: "Indomie Goreng", price: 3500 }),
  makeProduct({ id: "2", name: "Beras Premium 5kg", price: 75000 }),
  makeProduct({ id: "3", name: "Minyak Goreng 2L", price: 28000 }),
  makeProduct({ id: "4", name: "Telur Ayam 1kg", price: 29000 }),
  makeProduct({ id: "5", name: "Gula Pasir 1kg", price: 16000 }),
];

// Simple search that filters by name substring (case insensitive)
function simpleSearch(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return products.filter((p) => p.name.toLowerCase().includes(q));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSearch(opts?: {
  onSelect?: (product: Product) => void;
  useIndex?: () => (query: string) => Product[];
}) {
  return render(
    <Search
      useIndex={opts?.useIndex ?? (() => simpleSearch)}
      onSelect={opts?.onSelect ?? (() => {})}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Search", () => {
  // --- Rendering ---

  test("renders search input with 'Cari: F1' label", () => {
    renderSearch();
    expect(screen.getByText(/Cari:/)).not.toBeNull();
    expect(screen.getByText("F1")).not.toBeNull();
  });

  test("renders search input with correct type", () => {
    renderSearch();
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.type).toBe("search");
  });

  // --- Typing / filtering ---

  test("typing in input shows filtered results", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });
  });

  test("clearing input hides results", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.clear(input);

    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(true);
    });
  });

  // --- Focus-based visibility ---

  test("shows Output when filtered is non-empty and input is focused", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(false);
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });
  });

  test("hides Output when input loses focus", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.tab();

    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(true);
    });
  });

  test("shows Output again when input regains focus with non-empty filtered", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.tab();
    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(true);
    });

    input.focus();
    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(false);
    });
  });

  // --- Backdrop ---

  test("clicking backdrop hides Output", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    const backdrop = document.querySelector(".z-10")!;
    await user.click(backdrop);

    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(true);
    });
  });

  // --- Submit ---

  test("pressing Enter with results selects first product", async () => {
    const user = userEvent.setup();
    const onSelect = mock((_p: Product) => {});
    renderSearch({ onSelect });

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("1");
    expect(onSelect.mock.calls[0][0].name).toBe("Indomie Goreng");
  });

  test("pressing Enter with no results shows error", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "zzz_nonexistent");

    await user.keyboard("{Enter}");

    expect(await screen.findByText("Barang tidak ditemukan")).not.toBeNull();
  });

  test("after selection, query resets and input blurs", async () => {
    const user = userEvent.setup();
    const onSelect = mock((_p: Product) => {});
    renderSearch({ onSelect });

    const input = screen.getByRole("searchbox") as HTMLInputElement;
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(input.value).toBe("");
    });

    await waitFor(() => {
      const output = document.querySelector("output")!;
      expect(output.classList.contains("hidden")).toBe(true);
    });
  });

  // --- Error ---

  test("error is cleared when typing a new query", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "zzz_nonexistent");

    await user.keyboard("{Enter}");
    expect(await screen.findByText("Barang tidak ditemukan")).not.toBeNull();

    await user.clear(input);
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.queryByText("Barang tidak ditemukan")).toBeNull();
    });
  });

  // --- ArrowDown integration ---

  test("ArrowDown on input focuses first card in Output", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.keyboard("{ArrowDown}");

    await waitFor(() => {
      const outputButtons = document.querySelectorAll("ol > li > button");
      expect(document.activeElement).toBe(outputButtons[0]);
    });
  });

  test("ArrowDown from input then Enter selects the product", async () => {
    const user = userEvent.setup();
    const onSelect = mock((_p: Product) => {});
    renderSearch({ onSelect });

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].name).toBe("Indomie Goreng");
  });

  // --- useIndex is called correctly ---

  test("search function from useIndex filters results correctly", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("searchbox");
    await user.type(input, "indomie");

    // Should find Indomie Goreng but not Beras Premium
    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });
    expect(screen.queryByText("Beras Premium 5kg")).toBeNull();
  });
});
