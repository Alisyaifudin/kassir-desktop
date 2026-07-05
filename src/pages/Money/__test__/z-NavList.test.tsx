import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { NavList } from "../z-NavList";
import { render } from "~/lib/render";
import { StatefullPockets } from "./mock";

function renderNavList(opts?: { state?: StatefullPockets }) {
  const state = opts?.state ?? new StatefullPockets();
  return render(<NavList usePockets={() => state.usePockets()} onReorder={() => {}} />);
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

  // DO NOT ADD stateful changes on pocket type.
});
