import { describe, test, expect } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect, Layer } from "effect";
import { PocketService } from "~/services/pocket";
import page from "../page";
import { render } from "~/lib/render";
import { StatefullPockets, makePocketService } from "./mock";
import { PocketError } from "~/services/pocket/error";

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when PocketService is provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.succeed(PocketService, makePocketService());
    expect(() =>
      Effect.runSync(Effect.provide(program, layer)),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makePocketService>[0]) {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(PocketService, makePocketService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /catatan keuangan/i }),
    ).not.toBeNull();
  });

  test("shows loading skeleton while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/catatan keuangan/i)).not.toBeNull();
    });
  });

  test("shows error message when loader fails", async () => {
    renderPage({
      loader: () =>
        Effect.fail(new PocketError(new Error("Gagal memuat data"))),
    });
    expect(await screen.findByText(/Gagal memuat data/i)).not.toBeNull();
  });

  describe("when loaded successfully", () => {
    test("renders pocket list items", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Penjualan")).not.toBeNull();
        expect(screen.getByText("Pengeluaran")).not.toBeNull();
        expect(screen.getByText("Kas")).not.toBeNull();
      });
    });

    test("renders 'Kantong Baru' button", async () => {
      renderPage();
      expect(
        await screen.findByRole("button", { name: /kantong baru/i }),
      ).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Integration: stateful round-trip
  // -----------------------------------------------------------------------

  describe("User interactions", () => {
    function renderPageWithState(pocketState?: StatefullPockets) {
      const state = pocketState ?? new StatefullPockets();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(PocketService, makePocketService({ state })),
        ),
      );
      return render(<Page />);
    }

    test("adding a new pocket makes it appear in the list", async () => {
      const user = userEvent.setup();
      renderPageWithState();

      await user.click(
        await screen.findByRole("button", { name: /kantong baru/i }),
      );
      const dialog = await screen.findByRole("dialog");

      await user.type(
        within(dialog).getByLabelText("Nama"),
        "Tabungan",
      );
      await user.click(within(dialog).getByRole("button", { name: /tambah/i }));

      // Dialog closes on success
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      // New pocket appears
      await waitFor(() => {
        expect(screen.getByText("Tabungan")).not.toBeNull();
      });
    });

    test("shows error when add fails", async () => {
      const user = userEvent.setup();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            PocketService,
            makePocketService({ addError: "Nama sudah dipakai" }),
          ),
        ),
      );
      render(<Page />);

      await user.click(
        await screen.findByRole("button", { name: /kantong baru/i }),
      );
      const dialog = await screen.findByRole("dialog");

      await user.type(within(dialog).getByLabelText("Nama"), "Penjualan");
      await user.click(within(dialog).getByRole("button", { name: /tambah/i }));

      expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
      expect(screen.getByRole("dialog")).not.toBeNull();
    });
  });
});
