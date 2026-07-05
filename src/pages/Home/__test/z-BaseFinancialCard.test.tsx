import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { Wallet } from "lucide-react";
import { BaseFinancialCard } from "../z-BaseFinancialCard";
import { render } from "~/lib/render";
import { Sign } from "~/services/daily-summary";
import { DailySummaryError } from "~/services/daily-summary/error";

type FinancialData = { diffPercent?: number; sign: Sign; todayValue: number };

describe("BaseFinancialCard", () => {
  function renderCard(opts?: { loader?: () => Effect.Effect<FinancialData, DailySummaryError> }) {
    return render(
      <BaseFinancialCard
        label="Pendapatan Hari Ini"
        icon={Wallet}
        color="text-green-500"
        errorTitle="Gagal memuat pendapatan"
        loader={opts?.loader ?? (() => Effect.succeed({ diffPercent: 5, sign: "+" as Sign, todayValue: 150000 }))}
      />,
    );
  }

  test("renders value on success", async () => {
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("Rp 150000")).not.toBeNull();
    });
  });

  test("renders diffPercent description on success", async () => {
    renderCard({
      loader: () => Effect.succeed({ diffPercent: 10, sign: "+" as Sign, todayValue: 200000 }),
    });
    await waitFor(() => {
      expect(screen.getByText("+10% dari kemarin")).not.toBeNull();
    });
  });

  test("renders negative diffPercent", async () => {
    renderCard({
      loader: () => Effect.succeed({ diffPercent: 3, sign: "-" as Sign, todayValue: 100000 }),
    });
    await waitFor(() => {
      expect(screen.getByText("-3% dari kemarin")).not.toBeNull();
    });
  });

  test("renders empty description when diffPercent is undefined", async () => {
    renderCard({
      loader: () => Effect.succeed({ sign: "+" as Sign, todayValue: 50000 }),
    });
    await waitFor(() => {
      expect(screen.getByText("Rp 50000")).not.toBeNull();
    });
    // Description <span> is the next sibling of the value <span>; should be empty
    const desc = screen.getByText("Rp 50000").nextElementSibling;
    expect(desc?.textContent).toBe("");
  });

  test("shows loading skeleton initially", () => {
    renderCard({
      loader: () => Effect.never,
    });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("shows error message when loader fails", async () => {
    renderCard({
      loader: () => Effect.fail(new DailySummaryError(new Error("Jaringan bermasalah"))),
    });
    await waitFor(() => {
      expect(screen.getByText("Gagal memuat pendapatan")).not.toBeNull();
      expect(screen.getByText("Jaringan bermasalah")).not.toBeNull();
    });
  });
});
