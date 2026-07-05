import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { UserService } from "~/services/user";
import { DailySummaryService, type Sign } from "~/services/daily-summary";
import { DailySummaryError } from "~/services/daily-summary/error";
import page from "../page";
import { render } from "~/lib/render";
import type { Cashier } from "~/services/cashier";
import { DateService } from "~/services/date";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockUser: Cashier = { name: "Budi", role: "admin", id: "1" };
const today = "Senin, 1 Januari 2025";

// ---------------------------------------------------------------------------
// Mock services
// ---------------------------------------------------------------------------

function makeUserService(opts?: { user?: Cashier }): typeof UserService.Service {
  const user = opts?.user ?? mockUser;
  return {
    loader: () => Effect.void,
    useUser: () => user,
    user,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

function makeDailySummaryService(
  opts?: {
    incomeError?: string;
    expenseError?: string;
    countError?: string;
  },
): typeof DailySummaryService.Service {
  return {
    total: (type) => {
      if (type === "in" && opts?.incomeError) {
        return Effect.fail(new DailySummaryError(new Error(opts.incomeError)));
      }
      if (type === "out" && opts?.expenseError) {
        return Effect.fail(new DailySummaryError(new Error(opts.expenseError)));
      }
      return Effect.succeed({
        diffPercent: 5,
        sign: "+" as Sign,
        todayValue: 150000,
      });
    },
    count: () => {
      if (opts?.countError) {
        return Effect.fail(new DailySummaryError(new Error(opts.countError)));
      }
      return Effect.succeed({ in: 10, out: 5 });
    },
  };
}

function makeDateService(): typeof DateService.Service {
  return {
    today: {
      str: () => today,
    },
  };
}

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.mergeAll(
      Layer.succeed(UserService, makeUserService()),
      Layer.succeed(DailySummaryService, makeDailySummaryService()),
      Layer.succeed(DateService, makeDateService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  function renderPage(
    userOpts?: Parameters<typeof makeUserService>[0],
    summaryOpts?: Parameters<typeof makeDailySummaryService>[0],
  ) {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(UserService, makeUserService(userOpts)),
        Effect.provideService(
          DailySummaryService,
          makeDailySummaryService(summaryOpts),
        ),
        Effect.provideService(DateService, makeDateService()),
      ),
    );
    return render(<Page />);
  }

  // 🚨 WithLoader is in the tree — every assertion must use await

  test("renders greeting with user name", async () => {
    renderPage();
    expect(
      await screen.findByText(/selamat datang, budi!/i),
    ).not.toBeNull();
  });

  test("renders today's date", async () => {
    renderPage();
    expect(await screen.findByText(today)).not.toBeNull();
  });

  test("renders 'Navigasi Utama' heading", async () => {
    renderPage();
    expect(await screen.findByText(/navigasi utama/i)).not.toBeNull();
  });

  test("renders statistics cards", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pendapatan Hari Ini")).not.toBeNull();
      expect(screen.getByText("Pengeluaran Hari Ini")).not.toBeNull();
      expect(screen.getByText("Total Transaksi")).not.toBeNull();
    });
  });

  test("renders nav cards", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Toko")).not.toBeNull();
      expect(screen.getByText("Stok")).not.toBeNull();
      expect(screen.getByText("Riwayat")).not.toBeNull();
      expect(screen.getByText("Pengaturan")).not.toBeNull();
    });
  });

  describe("as admin", () => {
    test("renders admin-only nav cards", async () => {
      renderPage({ user: { ...mockUser, role: "admin" } });
      await waitFor(() => {
        expect(screen.getByText("Analisis")).not.toBeNull();
        expect(screen.getByText("Uang")).not.toBeNull();
        expect(screen.getByText("Kasir")).not.toBeNull();
        expect(screen.getByText("Pelanggan")).not.toBeNull();
      });
    });

    test("admin nav cards have descriptions", async () => {
      renderPage({ user: { ...mockUser, role: "admin" } });
      await waitFor(() => {
        expect(
          screen.getByText(/pantau perkembangan bisnis dengan grafik/i),
        ).not.toBeNull();
        expect(
          screen.getByText(/kelola keuangan dan kasir toko/i),
        ).not.toBeNull();
        expect(
          screen.getByText(/kelola akun kasir dan peran/i),
        ).not.toBeNull();
      });
    });
  });

  describe("as regular user", () => {
    test("does not render admin-only nav cards", async () => {
      renderPage({ user: { ...mockUser, role: "user" } });
      await waitFor(() => {
        // Public cards visible
        expect(screen.getByText("Toko")).not.toBeNull();
        expect(screen.getByText("Stok")).not.toBeNull();
      });
      expect(screen.queryByText("Analisis")).toBeNull();
      expect(screen.queryByText("Uang")).toBeNull();
      expect(screen.queryByText("Kasir")).toBeNull();
      expect(screen.queryByText("Pelanggan")).toBeNull();
    });
  });

  describe("error states", () => {
    test("shows error when income data fails", async () => {
      renderPage({}, { incomeError: "Pendapatan gagal" });
      await waitFor(() => {
        expect(screen.getByText("Gagal memuat pendapatan")).not.toBeNull();
        expect(screen.getByText("Pendapatan gagal")).not.toBeNull();
      });
    });

    test("shows error when expense data fails", async () => {
      renderPage({}, { expenseError: "Pengeluaran gagal" });
      await waitFor(() => {
        expect(screen.getByText("Gagal memuat pengeluaran")).not.toBeNull();
        expect(screen.getByText("Pengeluaran gagal")).not.toBeNull();
      });
    });

    test("shows error when transaction count fails", async () => {
      renderPage({}, { countError: "Total gagal" });
      await waitFor(() => {
        expect(screen.getByText("Gagal memuat data")).not.toBeNull();
        expect(screen.getByText("Total gagal")).not.toBeNull();
      });
    });
  });
});
