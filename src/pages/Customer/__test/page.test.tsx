import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { CustomerService, CustomerError } from "~/services/customer";
import page from "../page";
import { render } from "~/lib/render";
import type { Customer } from "~/services/customer/type";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockCustomers: Customer[] = [
  { name: "Budi", phone: "08123456789", id: "1" },
  { name: "Ani", phone: "08987654321", id: "2" },
  { name: "Citra", phone: "08561234567", id: "3" },
];

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

function makeCustomerService(opts?: {
  loader?: () => Effect.Effect<void, CustomerError>;
  customers?: Customer[];
}): typeof CustomerService.Service {
  const customers = opts?.customers ?? mockCustomers;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useCustomers: () => customers,
    add: () => Effect.void,
    set: () => Effect.void,
    delete: () => Effect.void,
  };
}

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
      page.pipe(Effect.provideService(CustomerService, makeCustomerService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /daftar pelanggan/i })).not.toBeNull();
    expect(screen.getByText(/kelola informasi pelanggan dan kontak/i)).not.toBeNull();
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
      loader: () => Effect.fail(new CustomerError(new Error("Gagal memuat data"))),
    });
    expect(await screen.findByText(/Gagal memuat data/i)).not.toBeNull();
  });

  describe("when loaded successfully", () => {
    test("renders customer list items", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByDisplayValue("Budi")).not.toBeNull();
        expect(screen.getByDisplayValue("Ani")).not.toBeNull();
        expect(screen.getByDisplayValue("Citra")).not.toBeNull();
      });
    });

    test("renders phone numbers", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByDisplayValue("08123456789")).not.toBeNull();
        expect(screen.getByDisplayValue("08987654321")).not.toBeNull();
        expect(screen.getByDisplayValue("08561234567")).not.toBeNull();
      });
    });

    test("renders 'Tambah Pelanggan' button", async () => {
      renderPage();
      expect(await screen.findByRole("button", { name: /tambah pelanggan/i })).not.toBeNull();
    });
  });
});
