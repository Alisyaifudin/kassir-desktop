import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { InfoService, InfoError } from "~/services/info";
import page from "../page";
import { render } from "~/lib/render";

function makeInfoService(opts?: {
  loader?: () => Effect.Effect<void, InfoError>;
}): typeof InfoService.Service {
  return {
    loader: opts?.loader ?? (() => Effect.void),
    showCashier: { useShowCashier: () => true, set: () => Effect.void },
    info: {
      useInfo: () => ({ name: "Toko", address: "Jl. A", header: "", footer: "" }),
      useName: () => "Toko",
      set: () => Effect.void,
    },
  };
}

describe("page (Effect)", () => {
  test("resolves when InfoService is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(InfoService, makeInfoService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makeInfoService>[0]) {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(InfoService, makeInfoService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(await screen.findByText(/pengaturan toko/i)).toBeInTheDocument();
    expect(screen.getByText(/kelola identitas dan preferensi toko/i)).toBeInTheDocument();
  });

  test("shows loading while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/pengaturan toko/i)).toBeInTheDocument();
    });
  });

  test("shows error when loader fails", async () => {
    renderPage({ loader: () => Effect.fail(new InfoError(new Error("Gagal"))) });
    expect(await screen.findByText("Gagal")).toBeInTheDocument();
  });

  test("renders form fields on success", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Toko")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Jl. A")).toBeInTheDocument();
    });
  });
});
