import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Output, type OutputHandle } from "./z-Output";
import { render } from "~/lib/render";
import type { Product } from "~/services/product";
import { useRef } from "react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

function makeProduct(overrides?: Partial<Product>): Product {
  return {
    id: "1",
    name: "Indomie Goreng",
    price: 3500,
    note: "",
    updatedAt: 0,
    codes: [],
    capitals: [],
    ...overrides,
  };
}

const productWithCodes: Product = makeProduct({
  id: "1",
  name: "Indomie Goreng",
  price: 3500,
  codes: ["8998866200318", "INDOMIE-GRG"],
});

const productWithCapitals: Product = makeProduct({
  id: "2",
  name: "Beras Premium 5kg",
  price: 75000,
  capitals: [
    { id: "c1", stock: 50, capital: 60000 },
    { id: "c2", stock: 30, capital: 58000 },
  ],
});

const productWithDepletedStock: Product = makeProduct({
  id: "3",
  name: "Minyak Goreng 2L",
  price: 28000,
  capitals: [
    { id: "c1", stock: 0, capital: 24000 },
    { id: "c2", stock: 15, capital: 23000 },
  ],
});

const productWithNote: Product = makeProduct({
  id: "4",
  name: "Gula Pasir 1kg",
  price: 16000,
  note: "Harga promo bulan ini",
});

const fullProduct: Product = {
  id: "5",
  name: "Telur Ayam 1kg",
  price: 29000,
  note: "Telur organik",
  updatedAt: 0,
  codes: ["TELUR-1KG", "8991234567890"],
  capitals: [
    { id: "c1", stock: 100, capital: 25000 },
    { id: "c2", stock: 0, capital: 24000 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderOutput(opts?: {
  products?: Product[];
  onClick?: (product: Product) => void;
  className?: string;
  ref?: React.RefObject<OutputHandle | null>;
}) {
  return render(
    <Output
      ref={opts?.ref as never}
      products={opts?.products ?? []}
      onClick={opts?.onClick ?? (() => {})}
      className={opts?.className}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Output", () => {
  // --- Rendering ---

  test("renders empty list when products is empty", () => {
    renderOutput({ products: [] });
    const buttons = document.querySelectorAll("ol > li > button");
    expect(buttons.length).toBe(0);
  });

  test("renders all product cards", async () => {
    renderOutput({ products: [productWithCodes, productWithCapitals] });
    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
      expect(screen.getByText("Beras Premium 5kg")).not.toBeNull();
    });
  });

  test("renders product name", async () => {
    renderOutput({ products: [productWithCodes] });
    expect(await screen.findByText("Indomie Goreng")).not.toBeNull();
  });

  test("renders formatted price", async () => {
    renderOutput({ products: [productWithCodes] });
    expect(await screen.findByText(/Rp3\.500/)).not.toBeNull();
  });

  test("renders note subtitle when present", async () => {
    renderOutput({ products: [productWithNote] });
    expect(await screen.findByText("Harga promo bulan ini")).not.toBeNull();
  });

  test("does not render note when absent", async () => {
    renderOutput({ products: [productWithCodes] });
    await waitFor(() => screen.getByText("Indomie Goreng"));
    const card = screen.getByText("Indomie Goreng").closest("button")!;
    // The note <p> should not exist inside this card
    const noteParagraphs = card.querySelectorAll("p.text-xs.text-gray-400");
    expect(noteParagraphs.length).toBe(0);
  });

  // --- Codes ---

  test("renders codes as badges when present", async () => {
    renderOutput({ products: [productWithCodes] });
    await waitFor(() => {
      expect(screen.getByText("8998866200318")).not.toBeNull();
      expect(screen.getByText("INDOMIE-GRG")).not.toBeNull();
    });
  });

  test("does not render codes section when empty", async () => {
    renderOutput({ products: [productWithCapitals] });
    await waitFor(() => screen.getByText("Beras Premium 5kg"));
    // productWithCapitals has no codes, so no code badges should appear
    const codeBadges = document.querySelectorAll(".font-mono");
    expect(codeBadges.length).toBe(0);
  });

  // --- Capitals ---

  test("renders capitals with Stok and Modal when present", async () => {
    renderOutput({ products: [productWithCapitals] });
    await waitFor(() => screen.getByText("Beras Premium 5kg"));
    const card = screen.getByText("Beras Premium 5kg").closest("button")!;
    // Check stock and modal values are present in the card text
    expect(card.textContent).toContain("Stok 50");
    expect(card.textContent).toContain("Modal Rp60.000");
    expect(card.textContent).toContain("Stok 30");
    expect(card.textContent).toContain("Modal Rp58.000");
  });

  test("does not render capitals section when empty", async () => {
    renderOutput({ products: [productWithCodes] });
    await waitFor(() => screen.getByText("Indomie Goreng"));
    const card = screen.getByText("Indomie Goreng").closest("button")!;
    const hr = card.querySelector("hr");
    expect(hr).toBeNull();
  });

  // --- Stock red glow ---

  test("applies red glow to stock lines when stock <= 0", async () => {
    renderOutput({ products: [productWithDepletedStock] });
    await waitFor(() => screen.getByText("Minyak Goreng 2L"));

    // The depleted stock line should have the red glow class
    const redGlow = document.querySelector(".bg-red-50\\/60");
    expect(redGlow).not.toBeNull();
    expect(redGlow!.textContent).toContain("Stok 0");
  });

  test("does not apply red glow to stock lines when stock > 0", async () => {
    renderOutput({ products: [productWithCapitals] });
    await waitFor(() => screen.getByText("Beras Premium 5kg"));

    // Neither capital has stock <= 0, so no red glow
    const redGlow = document.querySelector(".bg-red-50\\/60");
    expect(redGlow).toBeNull();
  });

  test("mixed stock: only depleted line glows red", async () => {
    renderOutput({ products: [fullProduct] });
    await waitFor(() => screen.getByText("Telur Ayam 1kg"));

    const redGlows = document.querySelectorAll(".bg-red-50\\/60");
    // Only c2 (stock: 0) should glow, not c1 (stock: 100)
    expect(redGlows.length).toBe(1);
    expect(redGlows[0].textContent).toContain("Stok 0");
  });

  // --- Alternating background ---

  test("applies alternating background for even/odd cards", async () => {
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
        makeProduct({ id: "3", name: "C", price: 3000 }),
      ],
    });
    await waitFor(() => screen.getByText("A"));

    const buttons = document.querySelectorAll("ol > li > button");
    expect(buttons[0].className).toContain("bg-blue-50");
    expect(buttons[1].className).toContain("bg-white");
    expect(buttons[2].className).toContain("bg-blue-50");
  });

  // --- Results cap ---

  test("caps results at 20 items", async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeProduct({ id: String(i), name: `Product ${i}`, price: 1000 }),
    );
    renderOutput({ products: many });
    await waitFor(() => screen.getByText("Product 0"));

    const buttons = document.querySelectorAll("ol > li > button");
    expect(buttons.length).toBe(20);
    expect(screen.queryByText("Product 20")).toBeNull();
  });

  // --- Click ---

  test("clicking a card calls onClick with the product", async () => {
    const user = userEvent.setup();
    const onClick = mock((_p: Product) => {});
    renderOutput({ products: [productWithCodes], onClick });

    await user.click(await screen.findByText("Indomie Goreng"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].id).toBe("1");
  });

  // --- Keyboard navigation ---

  test("ArrowDown moves active highlight to next item", async () => {
    const user = userEvent.setup();
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
      ],
    });

    await waitFor(() => screen.getByText("A"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      // First button should have focus
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(document.activeElement).toBe(btn);
      expect(btn.classList.contains("ring-2")).toBe(true);
    });

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[1] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });
  });

  test("ArrowUp moves active highlight to previous item", async () => {
    const user = userEvent.setup();
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
      ],
    });

    await waitFor(() => screen.getByText("A"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    // Go to second item first
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    // Then go back up
    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });
  });

  test("ArrowDown wraps to top from last item", async () => {
    const user = userEvent.setup();
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
      ],
    });

    await waitFor(() => screen.getByText("A"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    // Move to last item
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    // Wrap to first
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });
  });

  test("ArrowUp wraps to bottom from first item", async () => {
    const user = userEvent.setup();
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
      ],
    });

    await waitFor(() => screen.getByText("A"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    // Go to first then wrap up
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowUp}");

    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[1] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });
  });

  test("Home jumps to first item", async () => {
    const user = userEvent.setup();
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
        makeProduct({ id: "3", name: "C", price: 3000 }),
      ],
    });

    await waitFor(() => screen.getByText("A"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    // Go to third item
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    // Press Home
    await user.keyboard("{Home}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });
  });

  test("End jumps to last item", async () => {
    const user = userEvent.setup();
    renderOutput({
      products: [
        makeProduct({ id: "1", name: "A", price: 1000 }),
        makeProduct({ id: "2", name: "B", price: 2000 }),
        makeProduct({ id: "3", name: "C", price: 3000 }),
      ],
    });

    await waitFor(() => screen.getByText("A"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    await user.keyboard("{End}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[2] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });
  });

  test("Enter on active card calls onClick", async () => {
    const user = userEvent.setup();
    const onClick = mock((_p: Product) => {});
    renderOutput({
      products: [productWithCodes],
      onClick,
    });

    await waitFor(() => screen.getByText("Indomie Goreng"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(document.activeElement).toBe(btn);
    });

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].id).toBe("1");
  });

  test("Enter does nothing when no item is active", async () => {
    const user = userEvent.setup();
    const onClick = mock((_p: Product) => {});
    renderOutput({
      products: [productWithCodes],
      onClick,
    });

    await waitFor(() => screen.getByText("Indomie Goreng"));
    const ol = document.querySelector("ol")!;

    // Press Enter without activating any item first
    ol.focus();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(0);
  });

  test("highlights active item with ring and background", async () => {
    const user = userEvent.setup();
    renderOutput({ products: [productWithCodes] });

    await waitFor(() => screen.getByText("Indomie Goreng"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(btn.className).toContain("ring-2");
      expect(btn.className).toContain("ring-amber-500");
      expect(btn.className).toContain("bg-amber-100");
      expect(btn.className).toContain("border-amber-400");
    });
  });

  test("resets activeIndex when products array reference changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Output
        products={[productWithCodes]}
        onClick={() => {}}
      />,
    );

    await waitFor(() => screen.getByText("Indomie Goreng"));
    const ol = document.querySelector("ol")!;
    ol.focus();

    // Activate first item
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      const btn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(btn.classList.contains("ring-2")).toBe(true);
    });

    // Rerender with new products reference (same items)
    rerender(
      <Output
        products={[{ ...productWithCodes }]}
        onClick={() => {}}
      />,
    );

    // Active highlight should be reset (no ring on any button)
    await waitFor(() => {
      const buttons = document.querySelectorAll("ol > li > button");
      buttons.forEach((btn) => {
        expect(btn.classList.contains("ring-2")).toBe(false);
      });
    });
  });

  // --- forwardRef: focusFirst ---

  test("focusFirst() focuses the first button", async () => {
    const TestComponent = () => {
      const ref = useRef<OutputHandle>(null);
      return (
        <>
          <button onClick={() => ref.current?.focusFirst()}>Focus First</button>
          <Output
            ref={ref}
            products={[productWithCodes, productWithCapitals]}
            onClick={() => {}}
          />
        </>
      );
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText("Focus First"));

    // focusFirst sets activeIndex=0 which triggers useEffect to focus the button
    await waitFor(() => {
      const firstBtn = document.querySelectorAll("ol > li > button")[0] as HTMLElement;
      expect(document.activeElement).toBe(firstBtn);
    });
  });

  // --- className ---

  test("applies custom className to output element", () => {
    renderOutput({ products: [productWithCodes], className: "my-custom-class" });
    const output = document.querySelector("output")!;
    expect(output.classList.contains("my-custom-class")).toBe(true);
  });
});
