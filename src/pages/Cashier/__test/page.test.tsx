import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { CashierService, CashierError } from "~/services/cashier";
import { UserService, UserError } from "~/services/user";
import page from "../page";
import { render } from "~/lib/render";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestCashier {
  name: string;
  role: DBNamespace.Role;
  id: string;
}

const mockCashiers: TestCashier[] = [
  { name: "Budi", role: "admin", id: "1" },
  { name: "Ani", role: "user", id: "2" },
  { name: "Citra", role: "user", id: "3" },
];

// ---------------------------------------------------------------------------
// Mock services — plain objects matching the service interface
// ---------------------------------------------------------------------------

function makeCashierService(opts?: {
  loader?: () => Effect.Effect<void, CashierError>;
  cashiers?: TestCashier[];
}): typeof CashierService.Service {
  const cashiers = opts?.cashiers ?? mockCashiers;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useCashiers: () => cashiers,
    add: (input) => Effect.succeed({ name: input.name, id: "1", role: "user" }),
    delete: () => Effect.void,
    set: {
      name: () => Effect.void,
      hash: () => Effect.void,
      role: () => Effect.void,
    },
    get: {
      all: () => Effect.succeed(cashiers),
      byId: () => Effect.fail(new CashierError(new Error("not implemented"))),
    },
  };
}

function makeUserService(opts?: {
  loader?: () => Promise<UserError | null>;
  user?: TestCashier;
}): typeof UserService.Service {
  const user = opts?.user ?? mockCashiers[0];
  return {
    loader: opts?.loader ?? (() => Promise.resolve(null)),
    useUser: () => user,
    user,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves successfully when all required services are provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.mergeAll(
      Layer.succeed(CashierService, makeCashierService()),
      Layer.succeed(UserService, makeUserService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  function renderPage(
    cashierOpts?: Parameters<typeof makeCashierService>[0],
    userOpts?: Parameters<typeof makeUserService>[0],
  ) {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(CashierService, makeCashierService(cashierOpts)),
        Effect.provideService(UserService, makeUserService(userOpts)),
      ),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /daftar kasir/i })).toBeInTheDocument();
    expect(screen.getByText(/kelola akun kasir dan peran pengguna/i)).toBeInTheDocument();
  });

  test("shows loading skeleton while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    // Flush the pending state update from StateWrap
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/daftar kasir/i)).toBeInTheDocument();
    });
  });

  test("shows error message when loader fails", async () => {
    renderPage({
      loader: () => Effect.fail(new CashierError(new Error("Gagal memuat data"))),
    });
    expect(await screen.findByText(/Gagal memuat data/i)).toBeInTheDocument();
  });

  describe("when loaded successfully", () => {
    test("renders cashier list items", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Budi")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Ani")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Citra")).toBeInTheDocument();
      });
    });

    test("renders 'Tambah Kasir' button", async () => {
      renderPage();
      expect(await screen.findByRole("button", { name: /tambah kasir/i })).toBeInTheDocument();
    });
  });
});
