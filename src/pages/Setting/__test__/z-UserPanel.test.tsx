import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { UserPanel } from "../z-UserPanel";
import { render } from "~/lib/render";

describe("UserPanel", () => {
  test("renders only Profile nav link", () => {
    render(<UserPanel />);
    expect(screen.getByText("Profil")).not.toBeNull();
    expect(screen.queryByText("Toko")).toBeNull();
    expect(screen.queryByText("Data")).toBeNull();
    expect(screen.queryByText("Printer")).toBeNull();
    expect(screen.queryByText("Log")).toBeNull();
  });

  test("profile link points to /setting/profile", () => {
    render(<UserPanel />);
    expect(screen.getByRole("link").getAttribute("href")).toContain("/setting/profile");
  });
});
