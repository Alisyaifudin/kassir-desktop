import { describe, test, expect } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect, Layer } from "effect";
import { CashierService, CashierError } from "~/services/cashier";
import { UserService } from "~/services/user";
import page from "../page";
import { render } from "~/lib/render";
import {
  StatefullCashiers,
  StatefullUser,
  makeCashierService,
  makeUserService,
} from "./mock";

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
    expect(await screen.findByRole("heading", { name: /daftar kasir/i })).not.toBeNull();
    expect(screen.getByText(/kelola akun kasir dan peran pengguna/i)).not.toBeNull();
  });

  test("shows loading skeleton while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    // Flush the pending state update from StateWrap
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/daftar kasir/i)).not.toBeNull();
    });
  });

  test("shows error message when loader fails", async () => {
    renderPage({
      loader: () => Effect.fail(new CashierError(new Error("Gagal memuat data"))),
    });
    expect(await screen.findByText(/Gagal memuat data/i)).not.toBeNull();
  });

  describe("when loaded successfully", () => {
    test("renders cashier list items", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Budi")).not.toBeNull();
        expect(screen.getByDisplayValue("Ani")).not.toBeNull();
        expect(screen.getByDisplayValue("Citra")).not.toBeNull();
      });
    });

    test("renders 'Tambah Kasir' button", async () => {
      renderPage();
      expect(await screen.findByRole("button", { name: /tambah kasir/i })).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Integration: stateful round-trip (interact → mutate → re-render)
  // -----------------------------------------------------------------------

  describe("User interactions", () => {
    function renderPageWithState(cashierState?: StatefullCashiers) {
      const state = cashierState ?? new StatefullCashiers();
      const userState = new StatefullUser();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(CashierService, makeCashierService({ state })),
          Effect.provideService(UserService, makeUserService({ state: userState })),
        ),
      );
      return render(<Page />);
    }

    test("deleting a cashier removes it from the list", async () => {
      const user = userEvent.setup();
      const state = new StatefullCashiers();
      renderPageWithState(state);

      // Citra exists initially
      await waitFor(() => screen.getByDisplayValue("Citra"));

      // Click delete on Citra's row
      const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
      const deleteBtn = within(citraForm).getByRole("button");
      await user.click(deleteBtn);

      // Confirm deletion
      await waitFor(() => screen.getByText(/yakin\?/i));
      await user.click(screen.getByRole("button", { name: /hapus/i }));

      // Citra should be gone from the DOM
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Citra")).toBeNull();
      });

      // Other items still present
      expect(screen.getByText("Budi")).not.toBeNull();
      expect(screen.getByDisplayValue("Ani")).not.toBeNull();
    });

    test("adding a new cashier makes it appear in the list", async () => {
      const user = userEvent.setup();
      renderPageWithState();

      // Open the "Tambah Kasir" dialog
      await user.click(
        await screen.findByRole("button", { name: /tambah kasir/i }),
      );
      expect(await screen.findByRole("dialog")).not.toBeNull();

      // Fill and submit the form
      await user.type(screen.getByRole("textbox"), "Dian");
      await user.click(screen.getByRole("button", { name: /tambahkan/i }));

      // Close the dialog so we can see the list
      await user.click(screen.getByRole("button", { name: /batal/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      // New cashier "Dian" should now appear in the list
      await waitFor(() => {
        expect(screen.getByDisplayValue("Dian")).not.toBeNull();
      });
    });

    test("changing a cashier's role updates the select display", async () => {
      const user = userEvent.setup();
      renderPageWithState();

      await waitFor(() => screen.getByDisplayValue("Ani"));

      // Find Ani's role select trigger (combobox showing "User")
      const aniForm = screen.getByDisplayValue("Ani").closest("form")!;
      const roleTrigger = within(aniForm).getByRole("combobox");
      expect(roleTrigger.textContent).toContain("User");

      // Open the select popover
      await user.click(roleTrigger);

      // Click the "Admin" option
      await user.click(
        await screen.findByRole("option", { name: "Admin" }),
      );

      // The combobox should now show "Admin" after stateful re-render
      await waitFor(() => {
        expect(roleTrigger.textContent).toContain("Admin");
      });
    });

    test("updating a cashier's name re-renders with new value", async () => {
      const user = userEvent.setup();
      const state = new StatefullCashiers();
      const userState = new StatefullUser();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            CashierService,
            makeCashierService({ state }),
          ),
          Effect.provideService(
            UserService,
            makeUserService({ state: userState }),
          ),
        ),
      );
      render(<Page />);

      await waitFor(() => screen.getByDisplayValue("Ani"));
      const input = screen.getByDisplayValue("Ani");

      await user.clear(input);
      await user.type(input, "Ani Baru");
      await user.keyboard("{Enter}");

      // No error — callback succeeded
      const aniForm = input.closest("form")!;
      await waitFor(() => {
        const errors = aniForm.querySelectorAll(".text-destructive");
        expect(errors.length).toBe(0);
      });

      // Store was mutated
      expect(state.cashiers.find((c) => c.id === "2")?.name).toBe("Ani Baru");
    });

    test("shows error when add fails", async () => {
      const user = userEvent.setup();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            CashierService,
            makeCashierService({ addError: "Nama sudah dipakai" }),
          ),
          Effect.provideService(
            UserService,
            makeUserService(),
          ),
        ),
      );
      render(<Page />);

      await user.click(
        await screen.findByRole("button", { name: /tambah kasir/i }),
      );
      expect(await screen.findByRole("dialog")).not.toBeNull();

      await user.type(screen.getByRole("textbox"), "Budi");
      await user.click(screen.getByRole("button", { name: /tambahkan/i }));

      // Service-layer error should appear in the dialog
      expect(
        await screen.findByText("Nama sudah dipakai"),
      ).not.toBeNull();

      // Dialog should stay open on error
      expect(screen.getByRole("dialog")).not.toBeNull();
    });
  });
});
