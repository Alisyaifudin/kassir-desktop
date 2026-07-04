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
      expect(screen.getByText("Toko")).toBeInTheDocument();
      expect(screen.getByText("Stok")).toBeInTheDocument();
      expect(screen.getByText("Riwayat")).toBeInTheDocument();
      expect(screen.getByText("Pengaturan")).toBeInTheDocument();
    });
  });

  describe("as admin", () => {
    test("renders admin-only nav cards", async () => {
      renderGrid({ name: "Budi", role: "admin", id: "1" });
      await waitFor(() => {
        expect(screen.getByText("Analisis")).toBeInTheDocument();
        expect(screen.getByText("Uang")).toBeInTheDocument();
        expect(screen.getByText("Kontak")).toBeInTheDocument();
        expect(screen.getByText("Kasir")).toBeInTheDocument();
        expect(screen.getByText("Metode")).toBeInTheDocument();
        expect(screen.getByText("Pelanggan")).toBeInTheDocument();
      });
    });
  });

  describe("as regular user", () => {
    test("hides admin-only nav cards", async () => {
      renderGrid({ name: "Ani", role: "user", id: "2" });
      await waitFor(() => {
        expect(screen.getByText("Toko")).toBeInTheDocument();
      });
      expect(screen.queryByText("Analisis")).not.toBeInTheDocument();
      expect(screen.queryByText("Uang")).not.toBeInTheDocument();
      expect(screen.queryByText("Kontak")).not.toBeInTheDocument();
      expect(screen.queryByText("Kasir")).not.toBeInTheDocument();
      expect(screen.queryByText("Metode")).not.toBeInTheDocument();
      expect(screen.queryByText("Pelanggan")).not.toBeInTheDocument();
    });
  });

  test("nav cards have descriptions", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText(/buka toko dan lakukan transaksi penjualan/i)).toBeInTheDocument();
      expect(screen.getByText(/kelola stok produk dan inventaris barang/i)).toBeInTheDocument();
      expect(screen.getByText(/lihat riwayat transaksi dan catatan penjualan/i)).toBeInTheDocument();
    });
  });
});
