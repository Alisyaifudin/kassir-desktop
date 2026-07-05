import { describe, test, expect } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect, Layer } from "effect";
import { CustomerService, CustomerError } from "~/services/customer";
import page from "../page";
import { render } from "~/lib/render";
import { StatefullCustomers, makeCustomerService } from "./mock";

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves successfully when CustomerService is provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.succeed(CustomerService, makeCustomerService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makeCustomerService>[0]) {
    const Page = Effect.runSync(
      page.pipe(
        Effect.provideService(CustomerService, makeCustomerService(opts)),
      ),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /daftar pelanggan/i }),
    ).not.toBeNull();
    expect(
      screen.getByText(/kelola informasi pelanggan dan kontak/i),
    ).not.toBeNull();
  });

  test("shows loading skeleton while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    deferred.resolve();
    // Flush the pending state update from StateWrap
    await waitFor(() => {
      expect(screen.queryByText(/daftar pelanggan/i)).not.toBeNull();
    });
  });

  test("shows error message when loader fails", async () => {
    renderPage({
      loader: () =>
        Effect.fail(new CustomerError(new Error("Gagal memuat data"))),
    });
    expect(await screen.findByText(/Gagal memuat data/i)).not.toBeNull();
  });

  describe("when loaded successfully", () => {
    test("renders customer list items with names and phones", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByDisplayValue("Budi")).not.toBeNull();
        expect(screen.getByDisplayValue("Ani")).not.toBeNull();
        expect(screen.getByDisplayValue("Citra")).not.toBeNull();
        expect(screen.getByDisplayValue("08123456789")).not.toBeNull();
        expect(screen.getByDisplayValue("08987654321")).not.toBeNull();
        expect(screen.getByDisplayValue("08561234567")).not.toBeNull();
      });
    });

    test("renders 'Tambah Pelanggan' button", async () => {
      renderPage();
      expect(
        await screen.findByRole("button", { name: /tambah pelanggan/i }),
      ).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Integration: stateful round-trip (interact → mutate → re-render)
  // -----------------------------------------------------------------------

  describe("User interactions", () => {
    function renderPageWithState(customerState?: StatefullCustomers) {
      const state = customerState ?? new StatefullCustomers();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            CustomerService,
            makeCustomerService({ state }),
          ),
        ),
      );
      return render(<Page />);
    }

    test("deleting a customer removes it from the list", async () => {
      const user = userEvent.setup();
      renderPageWithState();

      await waitFor(() => screen.getByDisplayValue("Citra"));

      // Find delete button — third button in Citra's form (submit hidden, X button)
      const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
      const buttons = within(citraForm).getAllByRole("button");
      const deleteBtn = buttons[buttons.length - 1]; // last button is the X
      await user.click(deleteBtn);

      await waitFor(() => screen.getByText(/yakin\?/i));
      await user.click(screen.getByRole("button", { name: /hapus/i }));

      // Citra gone from DOM
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Citra")).toBeNull();
      });

      // Others still present
      expect(screen.getByDisplayValue("Budi")).not.toBeNull();
      expect(screen.getByDisplayValue("Ani")).not.toBeNull();
    });

    test("adding a new customer makes it appear in the list", async () => {
      const user = userEvent.setup();
      renderPageWithState();

      await user.click(
        await screen.findByRole("button", { name: /tambah pelanggan/i }),
      );
      const dialog = await screen.findByRole("dialog");

      // Scope queries to the dialog to avoid matching list item inputs
      await user.type(within(dialog).getByPlaceholderText("Nama"), "Dian");
      await user.type(within(dialog).getByPlaceholderText("No. Hp"), "08111111111");
      await user.click(within(dialog).getByRole("button", { name: /tambahkan/i }));

      // Dialog closes on success
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      // New customer appears in the list
      await waitFor(() => {
        expect(screen.getByDisplayValue("Dian")).not.toBeNull();
        expect(screen.getByDisplayValue("08111111111")).not.toBeNull();
      });
    });

    test("updating a customer's name re-renders with new value", async () => {
      const user = userEvent.setup();
      const state = new StatefullCustomers();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            CustomerService,
            makeCustomerService({ state }),
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
      await waitFor(() => {
        const form = input.closest("form")!;
        const errors = form.querySelectorAll(".text-destructive");
        expect(errors.length).toBe(0);
      });

      // Store was mutated
      expect(
        state.customers.find((c) => c.id === "2")?.name,
      ).toBe("Ani Baru");
    });

    test("shows error when add fails", async () => {
      const user = userEvent.setup();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            CustomerService,
            makeCustomerService({ addError: "Nama sudah dipakai" }),
          ),
        ),
      );
      render(<Page />);

      await user.click(
        await screen.findByRole("button", { name: /tambah pelanggan/i }),
      );
      const dialog = await screen.findByRole("dialog");

      await user.type(within(dialog).getByPlaceholderText("Nama"), "Budi");
      await user.click(within(dialog).getByRole("button", { name: /tambahkan/i }));

      expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
      expect(screen.getByRole("dialog")).not.toBeNull();
    });
  });
});
