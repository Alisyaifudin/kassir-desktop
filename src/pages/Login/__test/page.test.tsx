import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { CashierService, CashierError } from "~/services/cashier";
import { UserService } from "~/services/user";
import { HashService } from "~/services/hash";
import page from "../page";
import { render } from "~/lib/render";
import type { Cashier } from "~/services/cashier";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCashierService(opts?: {
  cashiers?: Cashier[];
  allError?: CashierError;
}): typeof CashierService.Service {
  const cashiers = opts?.cashiers ?? [];
  return {
    loader: () => Effect.void,
    useCashiers: () => cashiers,
    add: (input) => Effect.succeed({ ...input, id: "new-1" }),
    delete: () => Effect.void,
    set: {
      name: () => Effect.void,
      hash: () => Effect.void,
      role: () => Effect.void,
    },
    get: {
      all: () =>
        opts?.allError
          ? Effect.fail(opts.allError)
          : Effect.succeed(cashiers),
      byId: () => Effect.fail(new CashierError(new Error("not implemented"))),
    },
  };
}

function makeHashService(): typeof HashService.Service {
  return {
    hash: () => Effect.succeed("hashed"),
    verify: () => Effect.void,
  };
}

function makeUserService(): typeof UserService.Service {
  return {
    loader: () => Effect.void,
    useUser: () => ({ name: "Budi", role: "admin", id: "1" }),
    user: undefined,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.mergeAll(
      Layer.succeed(CashierService, makeCashierService()),
      Layer.succeed(HashService, makeHashService()),
      Layer.succeed(UserService, makeUserService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  function renderPage(opts?: {
    cashiers?: Cashier[];
    allError?: CashierError;
  }) {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(CashierService, makeCashierService(opts)),
        Effect.provideService(HashService, makeHashService()),
        Effect.provideService(UserService, makeUserService()),
      ),
    );
    return render(<Page />);
  }

  test("shows FreshForm when no cashiers exist", async () => {
    renderPage({ cashiers: [] });
    expect(await screen.findByText(/selamat datang/i)).toBeInTheDocument();
    expect(screen.getByText(/silakan buat akun terlebih/i)).toBeInTheDocument();
  });

  test("shows LoginForm when cashiers exist", async () => {
    const cashiers: Cashier[] = [
      { name: "Budi", role: "admin", id: "1" },
      { name: "Ani", role: "user", id: "2" },
    ];
    renderPage({ cashiers });
    expect(await screen.findByRole("heading", { name: "Masuk" })).toBeInTheDocument();
  });

  test("shows error when loading cashiers fails", async () => {
    renderPage({
      allError: new CashierError(new Error("Gagal memuat data")),
    });
    expect(await screen.findByText(/aplikasi bermasalah/i)).toBeInTheDocument();
    expect(screen.getByText("Gagal memuat data")).toBeInTheDocument();
  });
});
