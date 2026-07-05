import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { InfoService, InfoError } from "~/services/info";
import { UserService } from "~/services/user";
import { ShortcutService } from "~/services/shortcut";
import layout from "../index";
import { render } from "~/lib/render";
import { Cashier } from "~/services/cashier";

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeInfoService(opts?: {
  loader?: () => Effect.Effect<void, InfoError>;
  useName?: () => string;
}): typeof InfoService.Service {
  return {
    loader: opts?.loader ?? (() => Effect.void),
    info: {
      useName: opts?.useName ?? (() => "Toko Budi"),
      useInfo: () => ({ address: "", footer: "", header: "", name: "Toko Budi" }),
      set: () => Effect.void,
    },
    showCashier: {
      useShowCashier: () => true,
      set: () => Effect.void,
    },
  };
}

function makeUserService(opts?: { role?: DBNamespace.Role }): typeof UserService.Service {
  const user: Cashier = {
    id: "1",
    name: "Budi",
    role: opts?.role ?? "admin",
  };
  return {
    loader: () => Effect.void,
    useUser: () => user,
    user,
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

function makeShortcutService(): typeof ShortcutService.Service {
  return {
    useShowShortcut: () => false,
    hideShortcut: () => {},
    toggleShortcut: () => {},
  };
}

// ---------------------------------------------------------------------------
// Test: Layout Effect
// ---------------------------------------------------------------------------

describe("Layout (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () {
      yield* layout;
    });
    const layer = Layer.mergeAll(
      Layer.succeed(InfoService, makeInfoService()),
      Layer.succeed(UserService, makeUserService()),
      Layer.succeed(ShortcutService, makeShortcutService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Layout rendering
// ---------------------------------------------------------------------------

describe("Layout component", () => {
  function renderLayout(
    infoOpts?: Parameters<typeof makeInfoService>[0],
    userOpts?: Parameters<typeof makeUserService>[0],
  ) {
    const Layout = Effect.runSync(
      layout.pipe(
        Effect.provideService(InfoService, makeInfoService(infoOpts)),
        Effect.provideService(UserService, makeUserService(userOpts)),
        Effect.provideService(ShortcutService, makeShortcutService()),
      ),
    );
    return render(<Layout />);
  }

  // --- StateWrap: loading ---

  test("shows loading skeleton while info loader is pending", () => {
    renderLayout({
      loader: () => Effect.never,
    });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // --- StateWrap: error ---

  test("shows error message when info loader fails", async () => {
    renderLayout({
      loader: () => Effect.fail(new InfoError(new Error("Gagal memuat info"))),
    });
    expect(await screen.findByText(/Gagal memuat info/i)).not.toBeNull();
  });

  // --- StateWrap: success ---

  describe("when loaded successfully", () => {
    test("renders heading 'Beranda' on home path", async () => {
      renderLayout();
      expect(await screen.findByText("Beranda")).not.toBeNull();
    });

    test("renders store name from InfoService", async () => {
      renderLayout({ useName: () => "Toko Jaya" });
      expect(await screen.findByText(/Toko Jaya/i)).not.toBeNull();
    });

    test("truncates name at 16 characters", async () => {
      renderLayout({ useName: () => "Toko Sangat Panjang Sekali" });
      const name = await screen.findByTitle("Toko Sangat Panjang Sekali");
      expect(name.textContent?.length).toBeLessThanOrEqual(16);
    });

    test("renders navigation links", async () => {
      renderLayout();
      await waitFor(() => {
        expect(screen.getByText("Toko")).not.toBeNull();
        expect(screen.getByText("Stok")).not.toBeNull();
        expect(screen.getByText("Riwayat")).not.toBeNull();
      });
    });

    // --- Role-based rendering ---

    test("admin user sees Money navigation link", async () => {
      renderLayout({}, { role: "admin" });
      await waitFor(() => {
        expect(screen.getByText("Uang")).not.toBeNull();
      });
    });

    test("regular user does not see Money navigation link", async () => {
      renderLayout({}, { role: "user" });
      await waitFor(() => {
        expect(screen.getByText("Toko")).not.toBeNull();
        expect(screen.getByText("Stok")).not.toBeNull();
        expect(screen.getByText("Riwayat")).not.toBeNull();
      });
      expect(screen.queryByText("Uang")).toBeNull();
    });

    test("renders Refresh button", async () => {
      renderLayout();
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const refreshBtn = buttons.find((b) => b.querySelector("svg") !== null);
        expect(refreshBtn).not.toBeNull();
      });
    });

    test("renders Settings button", async () => {
      renderLayout();
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const settingsBtn = buttons.find((b) => b.querySelector("svg") !== null);
        expect(settingsBtn).not.toBeNull();
      });
    });
  });
});
