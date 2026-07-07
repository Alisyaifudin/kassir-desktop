import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { render as renderRaw } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { Outlet, createMemoryRouter, RouterProvider } from "react-router";
import { ImageService } from "~/services/image";
import { ImageError } from "~/services/image/error";
import { UserService } from "~/services/user";
import page from "../page";
import { makeImageService, makeUserService } from "./mock";

// ── Render helper ─────────────────────────────────────────────

function renderPage(
  imageOpts?: Parameters<typeof makeImageService>[0],
  userOpts?: Parameters<typeof makeUserService>[0],
) {
  const Page = Effect.runSync(
    page.pipe(
      Effect.provideService(ImageService, makeImageService(imageOpts)),
      Effect.provideService(UserService, makeUserService(userOpts)),
    ),
  );
  const router = createMemoryRouter(
    [
      {
        path: "/product/:id/images",
        element: <Outlet context={{ id: "product-1" }} />,
        children: [{ index: true, element: <Page /> }],
      },
    ],
    { initialEntries: ["/product/product-1/images"] },
  );
  return renderRaw(<RouterProvider router={router} />);
}

// ── Effect resolution ─────────────────────────────────────────

describe("page (Effect)", () => {
  test("resolves when all services are provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.mergeAll(
      Layer.succeed(ImageService, makeImageService()),
      Layer.succeed(UserService, makeUserService()),
    );
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

// ── StateWrap states ──────────────────────────────────────────

describe("StateWrap", () => {
  test("shows loading skeleton while loader is pending", () => {
    renderPage({ loader: () => Effect.never });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("shows error message when loader fails", async () => {
    renderPage({
      loader: () => Effect.fail(new ImageError(new Error("Gagal memuat gambar"))),
    });
    expect(await screen.findByText(/Gagal memuat gambar/i)).not.toBeNull();
  });

  test("renders when loader succeeds (no crash)", () => {
    // StateWrap resolves, ImageViewer renders with ResizeObserver dimensions
    // (ResizeObserver not available in happy-dom — just verify no throw)
    expect(() => renderPage()).not.toThrow();
  });
});
