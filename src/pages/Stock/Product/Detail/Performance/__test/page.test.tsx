import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { render as renderRaw } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { Outlet, createMemoryRouter, RouterProvider } from "react-router";
import { ProductService } from "~/services/product";
import { ConfigService } from "~/services/config";
import { DateService } from "~/services/date";
import page from "../page";
import { makeProductService, makeConfigService, makeDateService } from "./mock";

// ── Render helper ─────────────────────────────────────────────

/** Wraps Page in a router that provides outlet context for useId() */
function renderPage(
  productOpts?: Parameters<typeof makeProductService>[0],
  configOpts?: Parameters<typeof makeConfigService>[0],
) {
  const Page = Effect.runSync(
    page.pipe(
      Effect.provideService(ProductService, makeProductService(productOpts)),
      Effect.provideService(ConfigService, makeConfigService(configOpts)),
      Effect.provideService(DateService, makeDateService()),
    ),
  );
  const router = createMemoryRouter(
    [
      {
        path: "/product/:id",
        element: <Outlet context={{ id: "test-product-id" }} />,
        children: [{ index: true, element: <Page /> }],
      },
    ],
    { initialEntries: ["/product/test-product-id"] },
  );
  return renderRaw(<RouterProvider router={router} />);
}

// ---------------------------------------------------------------------------
// Effect resolution
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.mergeAll(
      Layer.succeed(ProductService, makeProductService()),
      Layer.succeed(ConfigService, makeConfigService()),
      Layer.succeed(DateService, makeDateService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  test("shows loading skeleton while loader is pending", async () => {
    renderPage({ loader: () => Effect.never });

    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("shows error message when loader fails", async () => {
    renderPage({ eventsError: "Gagal memuat data" });
    expect(await screen.findByText(/Gagal memuat data/i)).not.toBeNull();
  });

  test("renders content when events loaded", async () => {
    renderPage();
    // WithLoader resolves → children render, empty message should NOT appear
    await waitFor(() => {
      expect(screen.queryByText(/tidak ada data/i)).toBeNull();
    });
  });

  test("shows empty message when no events", async () => {
    renderPage({ events: [] });
    // Wait for WithLoader to resolve
    await waitFor(() => {
      expect(screen.queryByText(/tidak ada data/i)).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Preset buttons
// ---------------------------------------------------------------------------

describe("Preset buttons", () => {
  test("has all preset buttons", async () => {
    renderPage({ events: [] });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "30 Hari" })).not.toBeNull();
      expect(screen.getByRole("button", { name: "Tahun Ini" })).not.toBeNull();
      expect(screen.getByRole("button", { name: "1 Tahun" })).not.toBeNull();
      expect(screen.getByRole("button", { name: "Sepanjang Masa" })).not.toBeNull();
      expect(screen.getByRole("button", { name: "Kustom" })).not.toBeNull();
    });
  });

  test("default active preset is '30 Hari'", async () => {
    renderPage({ events: [] });

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "30 Hari" });
      // Active button should not have ghost variant class
      expect(btn.className).not.toContain("ghost");
    });
  });
});
