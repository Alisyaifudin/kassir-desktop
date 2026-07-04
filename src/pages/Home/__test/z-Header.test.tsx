import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Header } from "../z-Header";
import { render } from "~/lib/render";
import type { Cashier } from "~/services/cashier";

const today = "Senin, 1 Januari 2025";

describe("Header", () => {
  function renderHeader(opts?: { user?: Cashier; today?: string }) {
    return render(
      <Header
        today={opts?.today ?? today}
        useUser={() => opts?.user ?? { name: "Budi", role: "admin", id: "1" }}
      />,
    );
  }

  test("renders greeting with capitalized user name", () => {
    renderHeader();
    expect(screen.getByText(/selamat datang, budi!/i)).toBeInTheDocument();
  });

  test("renders greeting with different user", () => {
    renderHeader({ user: { name: "ani", role: "user", id: "2" } });
    expect(screen.getByText(/selamat datang, ani!/i)).toBeInTheDocument();
  });

  test("renders today prop", () => {
    renderHeader();
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  test("renders custom today prop", () => {
    renderHeader({ today: "Rabu, 15 Maret 2025" });
    expect(screen.getByText("Rabu, 15 Maret 2025")).toBeInTheDocument();
  });
});
