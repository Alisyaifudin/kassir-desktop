import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { UserService } from "~/services/user";
import { DailySummaryService, type Sign } from "~/services/daily-summary";
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
  };
}

function makeDailySummaryService(): typeof DailySummaryService.Service {
  return {
    total: () => Effect.succeed({ diffPercent: 5, sign: "+" as Sign, todayValue: 150000 }),
    count: () => Effect.succeed({ in: 10, out: 5 }),
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
  function renderPage(opts?: { user?: Cashier }) {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(UserService, makeUserService(opts)),
        Effect.provideService(DailySummaryService, makeDailySummaryService()),
        Effect.provideService(DateService, makeDateService()),
      ),
    );
    return render(<Page />);
  }

  test("renders greeting with user name", async () => {
    renderPage();
    expect(await screen.findByText(/selamat datang, budi!/i)).toBeInTheDocument();
  });

  test("renders today's date", async () => {
    renderPage();
    expect(await screen.findByText(today)).toBeInTheDocument();
  });

  test("renders 'Navigasi Utama' heading", async () => {
    renderPage();
    expect(await screen.findByText(/navigasi utama/i)).toBeInTheDocument();
  });

  test("renders nav cards", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Toko")).toBeInTheDocument();
      expect(screen.getByText("Stok")).toBeInTheDocument();
      expect(screen.getByText("Riwayat")).toBeInTheDocument();
      expect(screen.getByText("Pengaturan")).toBeInTheDocument();
    });
  });

  describe("as admin", () => {
    test("renders admin-only nav cards", async () => {
      renderPage({ user: { ...mockUser, role: "admin" } });
      await waitFor(() => {
        expect(screen.getByText("Analisis")).toBeInTheDocument();
        expect(screen.getByText("Uang")).toBeInTheDocument();
        expect(screen.getByText("Kasir")).toBeInTheDocument();
        expect(screen.getByText("Pelanggan")).toBeInTheDocument();
      });
    });
  });

  describe("as regular user", () => {
    test("does not render admin-only nav cards", async () => {
      renderPage({ user: { ...mockUser, role: "user" } });
      await waitFor(() => {
        // Public cards visible
        expect(screen.getByText("Toko")).toBeInTheDocument();
        expect(screen.getByText("Stok")).toBeInTheDocument();
      });
      expect(screen.queryByText("Analisis")).not.toBeInTheDocument();
      expect(screen.queryByText("Uang")).not.toBeInTheDocument();
      expect(screen.queryByText("Kasir")).not.toBeInTheDocument();
      expect(screen.queryByText("Pelanggan")).not.toBeInTheDocument();
    });
  });
});
