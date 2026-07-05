import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { StatisticsGrid } from "../z-StatisticsGrid";
import { render } from "~/lib/render";
import { Sign } from "~/services/daily-summary";
import { DailySummaryError } from "~/services/daily-summary/error";

describe("StatisticsGrid", () => {
  const incomeLoader = () =>
    Effect.succeed({ diffPercent: 10, sign: "+" as Sign, todayValue: 500000 });
  const expenseLoader = () =>
    Effect.succeed({ diffPercent: 5, sign: "-" as Sign, todayValue: 120000 });
  const totalLoader = () => Effect.succeed({ in: 42, out: 18 });

  function renderGrid(opts?: {
    incomeLoader?: () => Effect.Effect<
      { diffPercent?: number; sign: Sign; todayValue: number },
      DailySummaryError
    >;
    expenseLoader?: () => Effect.Effect<
      { diffPercent?: number; sign: Sign; todayValue: number },
      DailySummaryError
    >;
    totalLoader?: () => Effect.Effect<
      { in: number; out: number },
      DailySummaryError
    >;
  }) {
    return render(
      <StatisticsGrid
        incomeLoader={opts?.incomeLoader ?? incomeLoader}
        expenseLoader={opts?.expenseLoader ?? expenseLoader}
        totalTransactionLoader={opts?.totalLoader ?? totalLoader}
      />,
    );
  }

  describe("when loaded", () => {
    test("renders income card with label, value and description", async () => {
      renderGrid();
      await waitFor(() => {
        expect(screen.getByText("Pendapatan Hari Ini")).not.toBeNull();
        expect(screen.getByText("Rp 500000")).not.toBeNull();
        expect(screen.getByText("+10% dari kemarin")).not.toBeNull();
      });
    });

    test("renders expense card with label, value and description", async () => {
      renderGrid();
      await waitFor(() => {
        expect(screen.getByText("Pengeluaran Hari Ini")).not.toBeNull();
        expect(screen.getByText("Rp 120000")).not.toBeNull();
        expect(screen.getByText("-5% dari kemarin")).not.toBeNull();
      });
    });

    test("renders total transactions card with counts", async () => {
      renderGrid();
      await waitFor(() => {
        expect(screen.getByText("Total Transaksi")).not.toBeNull();
        expect(screen.getByText("42")).not.toBeNull();
        expect(screen.getByText("18")).not.toBeNull();
      });
    });

    test("all three cards rendered", async () => {
      renderGrid();
      await waitFor(() => {
        expect(screen.getByText("Pendapatan Hari Ini")).not.toBeNull();
        expect(screen.getByText("Pengeluaran Hari Ini")).not.toBeNull();
        expect(screen.getByText("Total Transaksi")).not.toBeNull();
      });
    });
  });

  describe("loading state", () => {
    test("shows loading skeletons for all three cards", () => {
      renderGrid({
        incomeLoader: () => Effect.never,
        expenseLoader: () => Effect.never,
        totalLoader: () => Effect.never,
      });

      // Three cards, each with skeleton elements
      const skeletons = document.querySelectorAll("[data-slot='skeleton']");
      expect(skeletons.length).toBeGreaterThan(2);
    });

    test("shows loading skeleton for income card only", () => {
      renderGrid({
        incomeLoader: () => Effect.never,
        expenseLoader,
        totalLoader,
      });

      // Income card still loading, others succeed
      const skeletons = document.querySelectorAll("[data-slot='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("error state", () => {
    test("shows error for income card when loader fails", async () => {
      renderGrid({
        incomeLoader: () =>
          Effect.fail(new DailySummaryError(new Error("Koneksi gagal"))),
      });

      await waitFor(() => {
        expect(screen.getByText("Gagal memuat pendapatan")).not.toBeNull();
        expect(screen.getByText("Koneksi gagal")).not.toBeNull();
      });
    });

    test("shows error for expense card when loader fails", async () => {
      renderGrid({
        expenseLoader: () =>
          Effect.fail(new DailySummaryError(new Error("Timeout"))),
      });

      await waitFor(() => {
        expect(screen.getByText("Gagal memuat pengeluaran")).not.toBeNull();
        expect(screen.getByText("Timeout")).not.toBeNull();
      });
    });

    test("shows error for total transactions when loader fails", async () => {
      renderGrid({
        totalLoader: () =>
          Effect.fail(new DailySummaryError(new Error("Server down"))),
      });

      await waitFor(() => {
        expect(screen.getByText("Gagal memuat data")).not.toBeNull();
        expect(screen.getByText("Server down")).not.toBeNull();
      });
    });

    test("partial failure — expense fails while others succeed", async () => {
      renderGrid({
        expenseLoader: () =>
          Effect.fail(new DailySummaryError(new Error("Parsial"))),
      });

      // Other cards should still render
      await waitFor(() => {
        expect(screen.getByText("Pendapatan Hari Ini")).not.toBeNull();
        expect(screen.getByText("Total Transaksi")).not.toBeNull();
      });

      // Expense card shows error
      expect(screen.getByText("Gagal memuat pengeluaran")).not.toBeNull();
      expect(screen.getByText("Parsial")).not.toBeNull();
    });
  });
});
