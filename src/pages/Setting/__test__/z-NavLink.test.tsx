import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { NavLink } from "../z-NavLink";
import { render } from "~/lib/render";
import { Home } from "lucide-react";

describe("NavLink", () => {
  test("renders link with label text", () => {
    render(
      <NavLink path="/setting/shop" icon={Home}>
        Toko
      </NavLink>,
    );
    expect(screen.getByText("Toko")).not.toBeNull();
  });

  test("renders as a link pointing to the path", () => {
    render(
      <NavLink path="/setting/shop" icon={Home}>
        Toko
      </NavLink>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/setting/shop");
  });

  test("renders with different labels and paths", () => {
    render(
      <NavLink path="/setting/profile" icon={Home}>
        Profil
      </NavLink>,
    );
    expect(screen.getByText("Profil")).not.toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toContain("/setting/profile");
  });
});
