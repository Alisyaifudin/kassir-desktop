import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { UserInfo } from "../z-UserInfo";
import type { Product } from "~/services/product";
import { render } from "~/lib/render";

const product: Product = {
  id: "p-1",
  name: "Kopi Arabica",
  price: 25000,
  note: "Kopi specialty grade A",
  updatedAt: Date.now(),
  codes: ["KOPI01", "ARABICA"],
  capitals: [
    { id: "cap-1", stock: 50, capital: 18000 },
    { id: "cap-2", stock: 30, capital: 20000 },
  ],
};

describe("UserInfo", () => {
  test("renders product name and price", () => {
    render(<UserInfo product={product} />);
    expect(screen.getByText("Kopi Arabica")).not.toBeNull();
    expect(screen.getByText("25000")).not.toBeNull();
  });

  test("renders product codes", () => {
    render(<UserInfo product={product} />);
    expect(screen.getByText("KOPI01")).not.toBeNull();
    expect(screen.getByText("ARABICA")).not.toBeNull();
  });

  test("renders capital info", () => {
    render(<UserInfo product={product} />);
    expect(screen.getByText(/18\.?000/)).not.toBeNull();
    expect(screen.getByText("50 pcs")).not.toBeNull();
  });

  test("renders note when present", () => {
    render(<UserInfo product={product} />);
    expect(screen.getByText("Kopi specialty grade A")).not.toBeNull();
  });

  test("hides note when empty", () => {
    render(<UserInfo product={{ ...product, note: "" }} />);
    expect(screen.queryByText(/catatan/i)).toBeNull();
  });

  test("shows heading", () => {
    render(<UserInfo product={product} />);
    expect(screen.getByRole("heading", { name: /info barang/i })).not.toBeNull();
  });
});
