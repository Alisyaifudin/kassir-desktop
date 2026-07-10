import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputSection } from "../index";
import { render } from "~/lib/render";
import type { Product } from "~/services/product";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

function makeProduct(overrides?: Partial<Product>): Product {
  return {
    id: "p1",
    name: "Indomie Goreng",
    price: 3500,
    note: "",
    updatedAt: 0,
    codes: ["8998866200318"],
    capitals: [{ id: "c1", stock: 50, capital: 3000 }],
    ...overrides,
  };
}

const noConflictProducts: Product[] = [
  makeProduct({ id: "p1", name: "Indomie Goreng", codes: ["INDOMIE-001"] }),
  makeProduct({ id: "p2", name: "Beras Premium", codes: ["BERAS-5KG"] }),
];

const conflictProducts: Product[] = [
  makeProduct({ id: "p1", name: "Indomie Goreng", codes: ["DUP-001"] }),
  makeProduct({ id: "p2", name: "Minyak Goreng", codes: ["DUP-002"] }),
];

const defaultManual = {
  codes: [""],
  name: "",
  qty: 1,
  price: 0,
};

function noopSet() {
  return {
    code: { edit: () => {}, add: () => {}, remove: () => {} },
    name: () => {},
    qty: () => {},
    price: () => {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InputSection", () => {
  // --- Rendering ---

  test("renders Search component", () => {
    render(
      <InputSection
        useProducts={() => noConflictProducts}
        useManual={() => defaultManual}
        onSubmit={() => {}}
        set={noopSet()}
      />,
    );
    expect(screen.getByText(/Cari:/)).not.toBeNull();
  });

  test("renders Manual component", () => {
    render(
      <InputSection
        useProducts={() => noConflictProducts}
        useManual={() => defaultManual}
        onSubmit={() => {}}
        set={noopSet()}
      />,
    );
    expect(screen.getByText(/Nama\*:/)).not.toBeNull();
    expect(screen.getByText(/Harga\*:/)).not.toBeNull();
    expect(screen.getByText(/Kuantitas\*:/)).not.toBeNull();
    expect(screen.getByText("Tambahkan")).not.toBeNull();
  });

  test("renders <hr> separator between Search and Manual", () => {
    render(
      <InputSection
        useProducts={() => noConflictProducts}
        useManual={() => defaultManual}
        onSubmit={() => {}}
        set={noopSet()}
      />,
    );
    const hr = document.querySelector("hr");
    expect(hr).not.toBeNull();
  });

  test("passes products to Search (results shown on type)", async () => {
    const user = userEvent.setup();
    render(
      <InputSection
        useProducts={() => noConflictProducts}
        useManual={() => defaultManual}
        onSubmit={() => {}}
        set={noopSet()}
      />,
    );

    const input = screen.getByRole("searchbox");
    input.focus();
    await user.type(input, "indomie");

    await waitFor(() => {
      expect(screen.getByText("Indomie Goreng")).not.toBeNull();
    });
  });

  // --- handleManualInput: no duplicates ---

  test("calls onSubmit when Manual submits with no duplicate codes", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => {});

    render(
      <InputSection
        useProducts={() => noConflictProducts}
        useManual={() => ({ codes: ["NEW-CODE"], name: "Barang Baru", qty: 1, price: 5000 })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelectorAll("form")[1]!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const calledWith = onSubmit.mock.calls[0][0] as Product;
    expect(calledWith.name).toBe("Barang Baru");
    expect(calledWith.codes).toContain("NEW-CODE");
    expect(calledWith.price).toBe(5000);
    expect(calledWith.qty).toBe(1);
    expect(calledWith.capitals).toEqual([]);
    expect(calledWith.note).toBe("");
  });

  // --- handleManualInput: duplicates ---

  test("does NOT call onSubmit when duplicate codes found", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => {});

    render(
      <InputSection
        useProducts={() => conflictProducts}
        useManual={() => ({ codes: ["DUP-001"], name: "Test", qty: 1, price: 1000 })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelectorAll("form")[1]!);

    await waitFor(() => {
      expect(screen.getByText(/Duplikat dengan Indomie Goreng/)).not.toBeNull();
    });
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  test("shows error per code when multiple duplicates", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => {});

    render(
      <InputSection
        useProducts={() => conflictProducts}
        useManual={() => ({
          codes: ["DUP-001", "DUP-002"],
          name: "Test",
          qty: 1,
          price: 1000,
        })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelectorAll("form")[1]!);

    await waitFor(() => {
      expect(screen.getByText(/Duplikat dengan Indomie Goreng/)).not.toBeNull();
      expect(screen.getByText(/Duplikat dengan Minyak Goreng/)).not.toBeNull();
    });
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  test("typing in duplicate code clears the error for that code", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => {});

    render(
      <InputSection
        useProducts={() => conflictProducts}
        useManual={() => ({
          codes: ["DUP-001"],
          name: "Test",
          qty: 1,
          price: 1000,
        })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelectorAll("form")[1]!);

    await waitFor(() => {
      expect(screen.getByText(/Duplikat dengan Indomie Goreng/)).not.toBeNull();
    });

    // Type in the code input to clear the error
    const codeInput = screen.getByPlaceholderText("Kode / Barcode");
    await user.clear(codeInput);
    await user.type(codeInput, "NEW-CODE");

    await waitFor(() => {
      expect(screen.queryByText(/Duplikat dengan/)).toBeNull();
    });
  });
});
