import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { StatisticsGrid } from "../z-StatisticsGrid";
import { render } from "~/lib/render";
import { Sign } from "~/services/daily-summary";

describe("StatisticsGrid", () => {
  const incomeLoader = () =>
    Effect.succeed({ diffPercent: 10, sign: "+" as Sign, todayValue: 500000 });
  const expenseLoader = () =>
    Effect.succeed({ diffPercent: 5, sign: "-" as Sign, todayValue: 120000 });
  const totalLoader = () => Effect.succeed({ in: 42, out: 18 });

  function renderGrid(opts?: {
    incomeLoader?: () => Effect.Effect<{ diffPercent?: number; sign: Sign; todayValue: number }>;
    expenseLoader?: () => Effect.Effect<{ diffPercent?: number; sign: Sign; todayValue: number }>;
    totalLoader?: () => Effect.Effect<{ in: number; out: number }>;
  }) {
    return render(
      <StatisticsGrid
        incomeLoader={opts?.incomeLoader ?? incomeLoader}
        expenseLoader={opts?.expenseLoader ?? expenseLoader}
        totalTransactionLoader={opts?.totalLoader ?? totalLoader}
      />,
    );
  }

  test("renders income card with label and value", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText("Pendapatan Hari Ini")).toBeInTheDocument();
      expect(screen.getByText("Rp 500000")).toBeInTheDocument();
      expect(screen.getByText("+10% dari kemarin")).toBeInTheDocument();
    });
  });

  test("renders expense card with label and value", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText("Pengeluaran Hari Ini")).toBeInTheDocument();
      expect(screen.getByText("Rp 120000")).toBeInTheDocument();
      expect(screen.getByText("-5% dari kemarin")).toBeInTheDocument();
    });
  });

  test("renders total transactions card with counts", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText("Total Transaksi")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("18")).toBeInTheDocument();
    });
  });

  test("all three cards are rendered", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText("Pendapatan Hari Ini")).toBeInTheDocument();
      expect(screen.getByText("Pengeluaran Hari Ini")).toBeInTheDocument();
      expect(screen.getByText("Total Transaksi")).toBeInTheDocument();
    });
  });
});
