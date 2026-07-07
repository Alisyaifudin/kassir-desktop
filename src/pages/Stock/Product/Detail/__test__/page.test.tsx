import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { render as renderRaw } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import Page from "../page";

// ── Render helpers ────────────────────────────────────────────

/** Render the Page at a given pathname, with a loader providing the id */
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/stock/product/:id",
        loader: () => "prod-1",
        Component: Page,
        children: [
          { index: true },
          { path: "images" },
          { path: "performance" },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return renderRaw(<RouterProvider router={router} />);
}

// ── Tabs rendering ────────────────────────────────────────────

describe("Detail tabs", () => {
  test("renders all three tab buttons", async () => {
    renderAt("/stock/product/prod-1");
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("Info")).not.toBeNull();
    expect(screen.getByText("Gambar")).not.toBeNull();
    expect(screen.getByText("Performa")).not.toBeNull();
  });

  // ── Active tab detection ────────────────────────────────────

  test("Info is active when pathname is /stock/product/:id", async () => {
    renderAt("/stock/product/prod-1");
    await new Promise((r) => setTimeout(r, 0));
    const infoBtn = screen.getByText("Info").closest("button")!;
    // Active tab has bg-background and shadow classes
    expect(infoBtn.className).toContain("bg-background");
    expect(infoBtn.className).toContain("shadow");
  });

  test("Gambar is active when pathname is /stock/product/:id/images", async () => {
    renderAt("/stock/product/prod-1/images");
    await new Promise((r) => setTimeout(r, 0));
    const gambarBtn = screen.getByText("Gambar").closest("button")!;
    expect(gambarBtn.className).toContain("bg-background");
    expect(gambarBtn.className).toContain("shadow");

    // Info should NOT be active
    const infoBtn = screen.getByText("Info").closest("button")!;
    expect(infoBtn.className).not.toContain("bg-background");
  });

  test("Performa is active when pathname is /stock/product/:id/performance", async () => {
    renderAt("/stock/product/prod-1/performance");
    await new Promise((r) => setTimeout(r, 0));
    const perfBtn = screen.getByText("Performa").closest("button")!;
    expect(perfBtn.className).toContain("bg-background");
    expect(perfBtn.className).toContain("shadow");
  });

  // ── Navigation links ────────────────────────────────────────

  test("each tab is a link with correct pathname", async () => {
    renderAt("/stock/product/prod-1");
    await new Promise((r) => setTimeout(r, 0));

    const infoLink = screen.getByText("Info").closest("a")!;
    expect(infoLink.getAttribute("href")).toContain("/stock/product/prod-1");

    const gambarLink = screen.getByText("Gambar").closest("a")!;
    expect(gambarLink.getAttribute("href")).toContain("/stock/product/prod-1/images");

    const perfLink = screen.getByText("Performa").closest("a")!;
    expect(perfLink.getAttribute("href")).toContain("/stock/product/prod-1/performance");
  });
});
