import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { NavGrid } from "../z-NavGrid";
import { render } from "~/lib/render";
import type { Cashier } from "~/services/cashier";

describe("NavGrid", () => {
  function renderGrid(user?: Cashier) {
    return render(
      <NavGrid useUser={() => user ?? { name: "Budi", role: "admin", id: "1" }} />,
    );
  }

  test("renders public nav cards for all roles", async () => {
    renderGrid({ name: "Budi", role: "user", id: "1" });
    await waitFor(() => {
      expect(screen.getByText("Toko")).not.toBeNull();
      expect(screen.getByText("Stok")).not.toBeNull();
      expect(screen.getByText("Riwayat")).not.toBeNull();
      expect(screen.getByText("Pengaturan")).not.toBeNull();
    });
  });

  describe("as admin", () => {
    test("renders admin-only nav cards", async () => {
      renderGrid({ name: "Budi", role: "admin", id: "1" });
      await waitFor(() => {
        expect(screen.getByText("Analisis")).not.toBeNull();
        expect(screen.getByText("Uang")).not.toBeNull();
        expect(screen.getByText("Kontak")).not.toBeNull();
        expect(screen.getByText("Kasir")).not.toBeNull();
        expect(screen.getByText("Metode")).not.toBeNull();
        expect(screen.getByText("Pelanggan")).not.toBeNull();
      });
    });
  });

  describe("as regular user", () => {
    test("hides admin-only nav cards", async () => {
      renderGrid({ name: "Ani", role: "user", id: "2" });
      await waitFor(() => {
        expect(screen.getByText("Toko")).not.toBeNull();
      });
      expect(screen.queryByText("Analisis")).not.not.toBeNull();
      expect(screen.queryByText("Uang")).not.not.toBeNull();
      expect(screen.queryByText("Kontak")).not.not.toBeNull();
      expect(screen.queryByText("Kasir")).not.not.toBeNull();
      expect(screen.queryByText("Metode")).not.not.toBeNull();
      expect(screen.queryByText("Pelanggan")).not.not.toBeNull();
    });
  });

  test("nav cards have descriptions", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText(/buka toko dan lakukan transaksi penjualan/i)).not.toBeNull();
      expect(screen.getByText(/kelola stok produk dan inventaris barang/i)).not.toBeNull();
      expect(screen.getByText(/lihat riwayat transaksi dan catatan penjualan/i)).not.toBeNull();
    });
  });
});
