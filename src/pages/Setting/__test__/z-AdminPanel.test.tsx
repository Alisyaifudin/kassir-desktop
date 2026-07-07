import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { AdminPanel } from "../z-AdminPanel";
import { render } from "~/lib/render";

describe("AdminPanel", () => {
  test("renders all admin nav links", () => {
    render(<AdminPanel />);
    expect(screen.getByText("Toko")).not.toBeNull();
    expect(screen.getByText("Profil")).not.toBeNull();
    expect(screen.getByText("Data")).not.toBeNull();
    expect(screen.getByText("Printer")).not.toBeNull();
    expect(screen.getByText("Log")).not.toBeNull();
  });

  test("renders links pointing to correct paths", () => {
    render(<AdminPanel />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs.some((h) => h?.includes("/setting/shop"))).toBe(true);
    expect(hrefs.some((h) => h?.includes("/setting/profile"))).toBe(true);
    expect(hrefs.some((h) => h?.includes("/setting/data"))).toBe(true);
    expect(hrefs.some((h) => h?.includes("/setting/printer"))).toBe(true);
    expect(hrefs.some((h) => h?.includes("/setting/log"))).toBe(true);
  });
});
