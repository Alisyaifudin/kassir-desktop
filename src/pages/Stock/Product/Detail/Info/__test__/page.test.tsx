import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { render as renderRaw } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { Outlet, createMemoryRouter, RouterProvider } from "react-router";
import { ProductService } from "~/services/product";
import { UserService } from "~/services/user";
import page from "../page";
import { makeProductService, makeUserService } from "./mock";

// ── Render helper ─────────────────────────────────────────────

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
    [
      {
        path: "/product/:id",
        element: <Outlet context={{ id: "product-1" }} />,
        children: [{ index: true, element: <Page /> }],
      },
    ],
    { initialEntries: ["/product/product-1"] },
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

// ── Error states ──────────────────────────────────────────────

describe("Error states", () => {
  test("shows NotFound when product is not found", async () => {
    renderPage({ notFound: true });
    expect(await screen.findByText(/tidak ditemukan/i)).not.toBeNull();
  });

  test("shows error message when product fetch fails", async () => {
    renderPage({ productError: "Gagal memuat" });
    expect(await screen.findByText(/Gagal memuat/i)).not.toBeNull();
  });

  test("shows error message when events fetch fails", async () => {
    renderPage({ eventsError: "Gagal memuat riwayat" });
    // Product loads fine (left column), events fail (right column)
    expect(await screen.findByText(/Gagal memuat riwayat/i)).not.toBeNull();
  });
});

// ── Success: Admin ────────────────────────────────────────────

describe("Admin view", () => {
  test("renders ProductForm with Simpan button", async () => {
    renderPage({}, { role: "admin" });
    expect(await screen.findByRole("button", { name: /simpan/i })).not.toBeNull();
  });

  test("renders HistoryList", async () => {
    renderPage({}, { role: "admin" });
    expect(await screen.findByText(/Penjualan/i)).not.toBeNull();
  });
});

// ── Success: User ─────────────────────────────────────────────

describe("User view", () => {
  test("renders UserInfo with product name", async () => {
    renderPage({}, { role: "user" });
    expect(await screen.findByText("Kopi Arabica")).not.toBeNull();
  });

  test("does not render Simpan button for non-admin", async () => {
    renderPage({}, { role: "user" });
    await screen.findByText("Kopi Arabica");
    expect(screen.queryByRole("button", { name: /simpan/i })).toBeNull();
  });
});
