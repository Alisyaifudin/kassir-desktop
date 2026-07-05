import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { NavList } from "../z-NavList";
import { render } from "~/lib/render";
import { StatefullPockets } from "./mock";

function renderNavList(opts?: { state?: StatefullPockets }) {
  const state = opts?.state ?? new StatefullPockets();
  return render(
    <NavList
      usePockets={() => state.usePockets()}
      onReorder={() => {}}
    />,
  );
}

describe("NavList", () => {
  test("renders all pocket names", async () => {
    renderNavList();
    await waitFor(() => {
      expect(screen.getByText("Penjualan")).not.toBeNull();
      expect(screen.getByText("Pengeluaran")).not.toBeNull();
      expect(screen.getByText("Kas")).not.toBeNull();
    });
  });

  test("renders lastMoney values when present", async () => {
    renderNavList();
    await waitFor(() => {
      // Penjualan has lastMoney: 500000
      expect(screen.getByText(/rp\s*500\.?000/i)).not.toBeNull();
      expect(screen.getByText(/rp\s*120\.?000/i)).not.toBeNull();
    });
  });

  test("shows 'Masih kosong' when no lastMoney", async () => {
    renderNavList();
    await waitFor(() => {
      // Kas has no lastMoney
      expect(screen.getByText("Masih kosong")).not.toBeNull();
    });
  });

  test("reacts to stateful changes", async () => {
    const state = new StatefullPockets();
    renderNavList({ state });

    await waitFor(() => {
      expect(screen.getByText("Penjualan")).not.toBeNull();
    });

    // Add a new pocket to the stateful store
    state.add({
      id: "4",
      name: "Tabungan",
      type: "absolute",
      ordering: 3,
      updatedAt: Date.now(),
      lastMoney: 100000,
    });

    // Component should re-render with new pocket
    await waitFor(() => {
      expect(screen.getByText("Tabungan")).not.toBeNull();
    });

    // Delete a pocket
    state.delete("1");

    // Penjualan should be gone
    await waitFor(() => {
      expect(screen.queryByText("Penjualan")).toBeNull();
    });
  });
});
