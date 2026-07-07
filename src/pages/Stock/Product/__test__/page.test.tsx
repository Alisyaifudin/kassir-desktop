import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { render as renderRaw } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ProductService } from "~/services/product";
import { UserService } from "~/services/user";
import page from "../page";
import { makeProductService, makeUserService } from "./mock";

function renderPage(
  productOpts?: Parameters<typeof makeProductService>[0],
  userOpts?: Parameters<typeof makeUserService>[0],
) {
  const Page = Effect.runSync(
    page.pipe(
      Effect.provideService(ProductService, makeProductService(productOpts)),
      Effect.provideService(UserService, makeUserService(userOpts)),
    ),
  );
  const router = createMemoryRouter(
    [{ path: "/stock/product", Component: Page }],
    { initialEntries: ["/stock/product"] },
  );
  return renderRaw(<RouterProvider router={router} />);
}

// ── Effect resolution ─────────────────────────────────────────

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.mergeAll(
      Layer.succeed(ProductService, makeProductService()),
      Layer.succeed(UserService, makeUserService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ── Page rendering ────────────────────────────────────────────

describe("Page component", () => {
  test("renders product names in table", async () => {
    renderPage();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("Kopi Arabica")).not.toBeNull();
    expect(screen.getByText("Gula Pasir")).not.toBeNull();
  });

  test("renders Tambah Produk link for admin", async () => {
    renderPage({}, { role: "admin" });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText(/tambah produk/i)).not.toBeNull();
  });

  test("shows error message when loader fails", async () => {
    renderPage({ allError: "Gagal memuat" });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText(/Gagal memuat/i)).not.toBeNull();
  });
});
