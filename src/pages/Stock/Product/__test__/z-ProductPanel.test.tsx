import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { ProductPanel } from "../z-ProductPanel";
import { render } from "~/lib/render";

const adminUser = () => ({ name: "Admin", role: "admin" as DBNamespace.Role, id: "u-1" });
const regularUser = () => ({ name: "User", role: "user" as DBNamespace.Role, id: "u-2" });

describe("ProductPanel", () => {
  test("renders search input", () => {
    render(<ProductPanel useUser={adminUser} />);
    // Search is rendered as an input
    expect(document.querySelector('input[type="search"]')).not.toBeNull();
  });

  test("renders filter button", () => {
    render(<ProductPanel useUser={adminUser} />);
    expect(screen.getByLabelText("Filter produk")).not.toBeNull();
  });

  test("renders Tambah Produk link for admin", () => {
    render(<ProductPanel useUser={adminUser} />);
    expect(screen.getByText(/tambah produk/i)).not.toBeNull();
  });

  test("hides Tambah Produk link for non-admin", () => {
    render(<ProductPanel useUser={regularUser} />);
    expect(screen.queryByText(/tambah produk/i)).toBeNull();
  });
});
