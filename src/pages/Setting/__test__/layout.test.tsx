import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { UserService } from "~/services/user";
import layout from "../layout";
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

describe("layout (Effect)", () => {
  test("resolves when UserService is provided", () => {
    const program = Effect.gen(function* () { yield* layout; });
    const layer = Layer.succeed(UserService, makeUserService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Layout component", () => {
  function renderLayout(role: "admin" | "user" = "admin") {
    const Layout = Effect.runSync(
      layout.pipe(Effect.provideService(UserService, makeUserService(role))),
    );
    return render(<Layout />);
  }

  test("renders Keluar button", () => {
    renderLayout();
    expect(screen.getByText("Keluar")).not.toBeNull();
  });

  test("renders version text", () => {
    renderLayout();
    expect(screen.getByText(/versi/i)).not.toBeNull();
  });

  describe("as admin", () => {
    test("renders AdminPanel nav links", () => {
      renderLayout("admin");
      expect(screen.getByText("Toko")).not.toBeNull();
      expect(screen.getByText("Profil")).not.toBeNull();
      expect(screen.getByText("Data")).not.toBeNull();
      expect(screen.getByText("Printer")).not.toBeNull();
      expect(screen.getByText("Log")).not.toBeNull();
    });
  });

  describe("as regular user", () => {
    test("renders UserPanel with only Profile link", () => {
      renderLayout("user");
      expect(screen.getByText("Profil")).not.toBeNull();
      expect(screen.queryByText("Toko")).toBeNull();
      expect(screen.queryByText("Data")).toBeNull();
      expect(screen.queryByText("Printer")).toBeNull();
      expect(screen.queryByText("Log")).toBeNull();
    });
  });
});
