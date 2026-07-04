import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { PrinterService, PrintError } from "~/services/print";
import page from "../page";
import { render } from "~/lib/render";

function makePrinterService(opts?: {
  loader?: () => Effect.Effect<void, PrintError>;
}): typeof PrinterService.Service {
  return {
    loader: opts?.loader ?? (() => Effect.void),
    testPrint: () => Effect.void,
    print: () => Effect.void,
    size: { useSize: () => 80, set: () => Effect.void },
    printer: {
      usePrinter: () => null,
      usePrinters: () => [],
      set: () => Effect.void,
    },
  };
}

describe("page (Effect)", () => {
  test("resolves when PrinterService is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(PrinterService, makePrinterService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makePrinterService>[0]) {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(PrinterService, makePrinterService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(await screen.findByText(/pengaturan printer/i)).toBeInTheDocument();
    expect(screen.getByText(/konfigurasi printer untuk cetak struk/i)).toBeInTheDocument();
  });

  test("shows loading while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/pengaturan printer/i)).toBeInTheDocument();
    });
  });

  test("shows error when loader fails", async () => {
    renderPage({ loader: () => Effect.fail(new PrintError(new Error("Gagal"))) });
    expect(await screen.findByText("Gagal")).toBeInTheDocument();
  });

  test("renders 'Tes Cetak' button on success", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: /tes cetak/i })).toBeInTheDocument();
  });
});
