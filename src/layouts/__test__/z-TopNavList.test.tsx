import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { render as renderRaw } from "@testing-library/react";
import { TopNavList } from "../z-TopNavList";

describe("TopNavList", () => {
  function renderNavList(role: "admin" | "user") {
    return renderRaw(
      <TopNavList
        useUser={() => ({ role, id: "1", name: "Test" })}
        useShowShortcut={() => false}
        hideShortcut={() => {}}
      />,
      { wrapper: MemoryRouter },
    );
  }

  test("admin user sees 4 navigation links including Money", async () => {
    renderNavList("admin");
    await screen.findByText("Toko");
    expect(screen.getByText("Toko")).not.toBeNull();
    expect(screen.getByText("Stok")).not.toBeNull();
    expect(screen.getByText("Riwayat")).not.toBeNull();
    expect(screen.getByText("Uang")).not.toBeNull();
  });

  test("regular user sees 3 navigation links without Money", async () => {
    renderNavList("user");
    await screen.findByText("Toko");
    expect(screen.getByText("Toko")).not.toBeNull();
    expect(screen.getByText("Stok")).not.toBeNull();
    expect(screen.getByText("Riwayat")).not.toBeNull();
    expect(screen.queryByText("Uang")).toBeNull();
  });
});
