import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { UserService } from "~/services/user";
import page from "../page";
import { render } from "~/lib/render";

function makeUserService(role: "admin" | "user" = "admin"): typeof UserService.Service {
  return {
    loader: () => Effect.void,
    useUser: () => ({ name: "Budi", role, id: "1" }),
    user: { name: "Budi", role, id: "1" },
    setUser: () => Effect.void,
    logout: () => {},
    login: () => {},
  };
}

describe("page (Effect)", () => {
  test("resolves when UserService is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(UserService, makeUserService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage(role: "admin" | "user" = "admin") {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(UserService, makeUserService(role))),
    );
    return render(<Page />);
  }

  test("renders heading", () => {
    renderPage();
    expect(screen.getByText("Pengaturan")).not.toBeNull();
  });

  test("renders user info", () => {
    renderPage();
    expect(screen.getByText(/masuk sebagai/i)).not.toBeNull();
    expect(screen.getByText(/budi/i, { exact: false })).not.toBeNull();
  });

  test("renders Keluar button", () => {
    renderPage();
    expect(screen.getByText("Keluar")).not.toBeNull();
  });

  describe("as admin", () => {
    test("renders all admin nav cards", () => {
      renderPage("admin");
      expect(screen.getByText("Toko")).not.toBeNull();
      expect(screen.getByText("Profil")).not.toBeNull();
      expect(screen.getByText("Data")).not.toBeNull();
      expect(screen.getByText("Printer")).not.toBeNull();
      expect(screen.getByText("Log")).not.toBeNull();
    });
  });

  describe("as regular user", () => {
    test("renders only Profile nav card", () => {
      renderPage("user");
      expect(screen.getByText("Profil")).not.toBeNull();
      expect(screen.queryByText("Toko")).toBeNull();
      expect(screen.queryByText("Data")).toBeNull();
      expect(screen.queryByText("Printer")).toBeNull();
      expect(screen.queryByText("Log")).toBeNull();
    });
  });
});
