import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Manual } from "../z-Manual";
import { render } from "~/lib/render";
import type { Product } from "~/services/product";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const emptyManual = {
  codes: [""],
  name: "",
  qty: 0,
  price: 0,
};

const prefilledManual = {
  codes: ["ABC123", "DEF456"],
  name: "Indomie Goreng",
  qty: 2,
  price: 3500,
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

describe("Manual", () => {
  // --- Rendering ---

  test("renders one code input when initial codes is empty", () => {
    render(
      <Manual
        useManual={() => ({ codes: [], name: "", qty: 0, price: 0 })}
        onSubmit={() => []}
        set={noopSet()}
      />,
    );
    const codeInputs = screen.getAllByPlaceholderText("Kode / Barcode");
    expect(codeInputs.length).toBe(1);
  });

  test("renders multiple code inputs from initial data", () => {
    render(
      <Manual useManual={() => prefilledManual} onSubmit={() => []} set={noopSet()} />,
    );
    const codeInputs = screen.getAllByPlaceholderText("Kode / Barcode");
    expect(codeInputs.length).toBe(2);
    expect((codeInputs[0] as HTMLInputElement).value).toBe("ABC123");
    expect((codeInputs[1] as HTMLInputElement).value).toBe("DEF456");
  });

  test("renders name input with initial value", () => {
    render(
      <Manual useManual={() => prefilledManual} onSubmit={() => []} set={noopSet()} />,
    );
    const input = screen.getByPlaceholderText("Nama produk") as HTMLInputElement;
    expect(input.value).toBe("Indomie Goreng");
  });

  test("renders price input with Rp prefix", () => {
    render(
      <Manual useManual={() => prefilledManual} onSubmit={() => []} set={noopSet()} />,
    );
    expect(screen.getByText("Rp")).not.toBeNull();
    // Price 3500 displayed as number input
    const priceInputs = screen.getAllByPlaceholderText("0");
    const priceInput = priceInputs.find(
      (el) => (el as HTMLInputElement).name === "price",
    ) as HTMLInputElement;
    expect(priceInput.value).toBe("3500");
  });

  test("renders qty input with initial value", () => {
    render(
      <Manual useManual={() => prefilledManual} onSubmit={() => []} set={noopSet()} />,
    );
    const qtyInputs = screen.getAllByPlaceholderText("0");
    const qtyInput = qtyInputs.find(
      (el) => (el as HTMLInputElement).name === "qty",
    ) as HTMLInputElement;
    expect(qtyInput.value).toBe("2");
  });

  test("renders Tambahkan submit button", () => {
    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={noopSet()} />,
    );
    expect(screen.getByText("Tambahkan")).not.toBeNull();
  });

  test("does NOT show × delete button when only 1 code", () => {
    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={noopSet()} />,
    );
    const deleteButtons = screen.queryAllByLabelText(/Hapus kode/);
    expect(deleteButtons.length).toBe(0);
  });

  // --- Codes add ---

  test('"+ Tambah Kode" adds a new empty code input', async () => {
    const user = userEvent.setup();
    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={noopSet()} />,
    );

    await user.click(screen.getByText("+ Tambah Kode"));

    const codeInputs = screen.getAllByPlaceholderText("Kode / Barcode");
    expect(codeInputs.length).toBe(2);
  });

  test("addCode calls set.code.add", async () => {
    const user = userEvent.setup();
    const codeAdd = mock(() => {});
    const set = {
      ...noopSet(),
      code: { edit: () => {}, add: codeAdd, remove: () => {} },
    };

    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={set} />,
    );

    await user.click(screen.getByText("+ Tambah Kode"));
    expect(codeAdd).toHaveBeenCalledTimes(1);
  });

  test("× delete button appears after adding a code", async () => {
    const user = userEvent.setup();
    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={noopSet()} />,
    );

    await user.click(screen.getByText("+ Tambah Kode"));
    const deleteButtons = screen.queryAllByLabelText(/Hapus kode/);
    expect(deleteButtons.length).toBe(2);
  });

  // --- Codes remove ---

  test("clicking × removes that code input", async () => {
    const user = userEvent.setup();
    render(
      <Manual useManual={() => prefilledManual} onSubmit={() => []} set={noopSet()} />,
    );

    const deleteButtons = screen.getAllByLabelText(/Hapus kode/);
    await user.click(deleteButtons[0]);

    const codeInputs = screen.getAllByPlaceholderText("Kode / Barcode");
    expect(codeInputs.length).toBe(1);
  });

  test("removeCode calls set.code.remove with correct index", async () => {
    const user = userEvent.setup();
    const codeRemove = mock((_i: number) => {});
    const set = {
      ...noopSet(),
      code: { edit: () => {}, add: () => {}, remove: codeRemove },
    };

    render(
      <Manual useManual={() => prefilledManual} onSubmit={() => []} set={set} />,
    );

    // Click the first × (Hapus kode 1, index 0)
    const deleteButtons = screen.getAllByLabelText(/Hapus kode/);
    await user.click(deleteButtons[0]);
    expect(codeRemove).toHaveBeenCalledWith(0);
    expect(codeRemove).toHaveBeenCalledTimes(1);
  });

  // --- Code input typing ---

  test("typing in code calls set.code.edit", async () => {
    const user = userEvent.setup();
    const codeEdit = mock((_i: number, _code: string) => {});
    const set = {
      ...noopSet(),
      code: { edit: codeEdit, add: () => {}, remove: () => {} },
    };

    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={set} />,
    );

    const input = screen.getByPlaceholderText("Kode / Barcode");
    await user.type(input, "NEW-CODE");
    expect(codeEdit).toHaveBeenCalled();
    // Last call should have the full value
    const lastCall = codeEdit.mock.calls[codeEdit.mock.calls.length - 1];
    expect(lastCall[0]).toBe(0);
    expect(lastCall[1]).toBe("NEW-CODE");
  });

  test("typing in name calls set.name", async () => {
    const user = userEvent.setup();
    const setName = mock((_name: string) => {});
    const set = { ...noopSet(), name: setName };

    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={set} />,
    );

    const input = screen.getByPlaceholderText("Nama produk");
    await user.type(input, "Produk Baru");
    const lastCall = setName.mock.calls[setName.mock.calls.length - 1];
    expect(lastCall[0]).toBe("Produk Baru");
  });

  test("typing price calls set.price", async () => {
    const user = userEvent.setup();
    const setPrice = mock((_price: number) => {});
    const set = { ...noopSet(), price: setPrice };

    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={set} />,
    );

    const priceInputs = screen.getAllByPlaceholderText("0");
    const priceInput = priceInputs.find(
      (el) => (el as HTMLInputElement).name === "price",
    )!;
    await user.type(priceInput, "5000");
    const lastCall = setPrice.mock.calls[setPrice.mock.calls.length - 1];
    expect(lastCall[0]).toBe(5000);
  });

  test("typing qty calls set.qty", async () => {
    const user = userEvent.setup();
    const setQty = mock((_qty: number) => {});
    const set = { ...noopSet(), qty: setQty };

    render(
      <Manual useManual={() => emptyManual} onSubmit={() => []} set={set} />,
    );

    const qtyInputs = screen.getAllByPlaceholderText("0");
    const qtyInput = qtyInputs.find(
      (el) => (el as HTMLInputElement).name === "qty",
    )!;
    await user.type(qtyInput, "3");
    const lastCall = setQty.mock.calls[setQty.mock.calls.length - 1];
    expect(lastCall[0]).toBe(3);
  });

  // --- Validation ---

  test("shows validation error when name is empty on submit", async () => {
    const user = userEvent.setup();
    render(
      <Manual
        useManual={() => ({ codes: [""], name: "", qty: 1, price: 0 })}
        onSubmit={() => []}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelector("form")!);

    expect(await screen.findByText("Harus ada")).not.toBeNull();
  });

  test("shows validation error when qty is 0 on submit", async () => {
    const user = userEvent.setup();
    render(
      <Manual
        useManual={() => ({ codes: [""], name: "Test", qty: 0, price: 1000 })}
        onSubmit={() => []}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelector("form")!);

    expect(await screen.findByText("Minimal 1")).not.toBeNull();
  });

  // --- Submit ---

  test("submit calls onSubmit with constructed product", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => [] as string[]);

    render(
      <Manual
        useManual={() => ({
          codes: ["ABC"],
          name: "Produk Test",
          qty: 2,
          price: 10000,
        })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const product = onSubmit.mock.calls[0][0] as Product;
    expect(product.name).toBe("Produk Test");
    expect(product.price).toBe(10000);
    expect(product.qty).toBe(2);
    expect(product.codes).toContain("ABC");
    expect(product.capitals).toEqual([]);
    expect(product.note).toBe("");
    expect(typeof product.id).toBe("string");
    expect(product.id.length).toBeGreaterThan(0);
  });

  test("filters empty codes before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => [] as string[]);

    render(
      <Manual
        useManual={() => ({
          codes: [""],
          name: "Produk Test",
          qty: 1,
          price: 5000,
        })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const product = onSubmit.mock.calls[0][0] as Product;
    expect(product.codes).toEqual([]);
  });

  test("displays errors from onSubmit per code", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => ["Error kode 1", ""] as string[]);

    render(
      <Manual
        useManual={() => ({
          codes: ["C1", "C2"],
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
    fireEvent.submit(document.querySelector("form")!);

    expect(await screen.findByText("Error kode 1")).not.toBeNull();
  });

  test("typing in code clears its error after submit", async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_p: Product) => ["Error kode 1"] as string[]);

    render(
      <Manual
        useManual={() => ({
          codes: ["C1"],
          name: "Test",
          qty: 1,
          price: 1000,
        })}
        onSubmit={onSubmit}
        set={noopSet()}
      />,
    );

    // Submit to get error
    const nameInput = screen.getByPlaceholderText("Nama produk");
    nameInput.focus();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Error kode 1")).not.toBeNull();
    });

    // Type to clear the error
    const input = screen.getByPlaceholderText("Kode / Barcode");
    await user.clear(input);
    await user.type(input, "FIXED");

    await waitFor(() => {
      expect(screen.queryByText("Error kode 1")).toBeNull();
    });
  });
});
