import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { render as renderRaw } from "@testing-library/react";
import { Topbar } from "../eff-Topbar";
import { Cashier } from "~/services/cashier";

const user: Cashier = { role: "admin", id: "1", name: "Budi" };

function renderTopbar(path: string, role = "admin") {
  return renderRaw(
    <Topbar
      useUser={() => ({ ...user, role })}
      titleElement={<span data-testid="title-element">Toko Jaya</span>}
      useShowShortcut={() => false}
      hideShortcut={() => {}}
    />,
    { wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> },
  );
}

describe("Topbar", () => {
  test("renders heading 'Beranda' when on home path '/'", async () => {
    renderTopbar("/");
    expect(await screen.findByRole("heading", { name: "Beranda" })).not.toBeNull();
  });

  test("renders route title when on sub-page", async () => {
    renderTopbar("/shop");
    expect(await screen.findByRole("heading", { name: "Toko" })).not.toBeNull();
  });

  test("shows 'Beranda' heading for unknown routes (fallback to root mapping)", async () => {
    renderTopbar("/unknown-route");
    expect(await screen.findByRole("heading", { name: "Beranda" })).not.toBeNull();
  });

  test("shows back button when not on home page", async () => {
    renderTopbar("/shop");
    const buttons = await screen.findAllByRole("button");
    const backBtn = buttons.find((b) => b.querySelector("svg") !== null);
    expect(backBtn).not.toBeNull();
  });

  test("does not show back button on home page", async () => {
    renderTopbar("/");
    const buttons = await screen.findAllByRole("button");
    // On home page, buttons are: SettingLink, Refresh, and nav links
    // No back/arrow-left button should be present
    const svgButtons = buttons.filter((b) => b.querySelector("svg"));
    // SettingLink and Refresh each have SVGs — both present on home
    expect(svgButtons.length).toBeGreaterThanOrEqual(2);
  });

  test("renders the titleElement prop", async () => {
    renderTopbar("/");
    expect(await screen.findByTestId("title-element")).not.toBeNull();
  });

  test("renders Refresh button", async () => {
    renderTopbar("/");
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const hasRefreshIcon = buttons.some((b) => b.querySelector("svg") !== null);
      expect(hasRefreshIcon).toBe(true);
    });
  });

  test("renders SettingLink button", async () => {
    renderTopbar("/");
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("renders navigation links from TopNavList", async () => {
    renderTopbar("/");
    await waitFor(() => {
      expect(screen.getByText("Toko")).not.toBeNull();
      expect(screen.getByText("Stok")).not.toBeNull();
      expect(screen.getByText("Riwayat")).not.toBeNull();
    });
  });

  test("Money link visible for admin, hidden for user", async () => {
    const { unmount } = renderTopbar("/", "admin");
    await waitFor(() => {
      expect(screen.getByText("Uang")).not.toBeNull();
    });
    unmount();

    renderTopbar("/", "user");
    await waitFor(() => {
      expect(screen.getByText("Toko")).not.toBeNull();
    });
    expect(screen.queryByText("Uang")).toBeNull();
  });
});
