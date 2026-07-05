import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { CashierService } from "~/services/cashier";
import { UserService } from "~/services/user";
import { HashService } from "~/services/hash";
import { SonnerService } from "~/services/sonner";
import page from "../page";
import { render } from "~/lib/render";

function makeCashierService(): typeof CashierService.Service {
  return {
    loader: () => Effect.void,
    useCashiers: () => [],
    add: () => Effect.succeed({ name: "Budi", role: "admin", id: "1" }),
    delete: () => Effect.void,
    set: { name: () => Effect.void, hash: () => Effect.void, role: () => Effect.void },
    get: {
      all: () => Effect.succeed([]),
      byId: () => Effect.succeed({ name: "Budi", role: "admin", id: "1", hash: "xxx" }),
    },
  };
}

function makeUserService(): typeof UserService.Service {
  return {
    loader: () => Effect.void,
    useUser: () => ({ name: "Budi", role: "admin", id: "1" }),
    user: { name: "Budi", role: "admin", id: "1" },
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

function makeHashService(): typeof HashService.Service {
  return {
    hash: () => Effect.succeed("hashed"),
    verify: () => Effect.void,
  };
}

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.mergeAll(
      Layer.succeed(CashierService, makeCashierService()),
      Layer.succeed(UserService, makeUserService()),
      Layer.succeed(HashService, makeHashService()),
      Layer.succeed(SonnerService, { error: () => {}, success: () => {} }),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage() {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(CashierService, makeCashierService()),
        Effect.provideService(UserService, makeUserService()),
        Effect.provideService(HashService, makeHashService()),
        Effect.provideService(SonnerService, { error: () => {}, success: () => {} }),
      ),
    );
    return render(<Page />);
  }

  test("renders heading and description", () => {
    renderPage();
    expect(screen.getByText(/pengaturan profil/i)).toBeInTheDocument();
    expect(screen.getByText(/kelola informasi akun dan keamanan/i)).toBeInTheDocument();
  });

  test("renders name form with current user name", () => {
    renderPage();
    expect(screen.getByDisplayValue("Budi")).toBeInTheDocument();
  });

  test("renders password change section", () => {
    renderPage();
    expect(screen.getByText(/ganti kata sandi/i)).toBeInTheDocument();
  });
});
