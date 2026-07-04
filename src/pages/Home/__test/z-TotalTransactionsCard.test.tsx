import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { TotalTransactionsCard } from "../z-TotalTransactionsCard";
import { render } from "~/lib/render";
import { DailySummaryError } from "~/services/daily-summary/error";

describe("TotalTransactionsCard", () => {
  function renderCard(opts?: {
    loader?: () => Effect.Effect<{ in: number; out: number }, DailySummaryError>;
  }) {
    return render(
      <TotalTransactionsCard
        loader={opts?.loader ?? (() => Effect.succeed({ in: 10, out: 5 }))}
      />,
    );
  }

  test("renders transaction counts on success", async () => {
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  test("renders 'Total Transaksi' label", async () => {
    renderCard();
    expect(await screen.findByText("Total Transaksi")).toBeInTheDocument();
  });

  test("shows loading skeleton initially", () => {
    renderCard({ loader: () => Effect.never });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("shows error message when loader fails", async () => {
    renderCard({
      loader: () => Effect.fail(new DailySummaryError(new Error("Server error"))),
    });
    await waitFor(() => {
      expect(screen.getByText("Gagal memuat data")).toBeInTheDocument();
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
