import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { render as renderRaw } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ProductService } from "~/services/product";
import page from "../page";
import { makeProductService } from "./mock";

// ── Render helper ─────────────────────────────────────────────

function renderPage(productOpts?: Parameters<typeof makeProductService>[0]) {
  const Page = Effect.runSync(
    page.pipe(Effect.provideService(ProductService, makeProductService(productOpts))),
  );
  const router = createMemoryRouter(
    [{ path: "/stock/product/new", Component: Page }],
    { initialEntries: ["/stock/product/new"] },
  );
  return renderRaw(<RouterProvider router={router} />);
}

// ── Effect resolution ─────────────────────────────────────────

describe("page (Effect)", () => {
  test("resolves when ProductService is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(ProductService, makeProductService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ── Rendering ─────────────────────────────────────────────────

describe("Page component", () => {
  test("renders heading", async () => {
    renderPage();
    // React Router's Component prop may render asynchronously
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("heading", { name: /tambah barang baru/i })).not.toBeNull();
  });

  test("renders form fields", async () => {
    renderPage();
    await new Promise((r) => setTimeout(r, 0));

    // Name and price fields are rendered
    const inputs = document.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);

    // Simpan button is rendered
    expect(screen.getByRole("button", { name: /simpan/i })).not.toBeNull();
  });

  test("renders Tambah kode and Tambah modal buttons", async () => {
    renderPage();
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByRole("button", { name: /tambah kode/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /tambah modal/i })).not.toBeNull();
  });
});
