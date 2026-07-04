import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { ConfigService } from "~/services/config";
import page from "../page";
import { render } from "~/lib/render";

function makeConfigService(): typeof ConfigService.Service {
  return {
    size: { useSize: () => "big", set: () => {} },
    theme: { useTheme: () => "light", set: () => {} },
  };
}

describe("page (Effect)", () => {
  test("resolves when ConfigService is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(ConfigService, makeConfigService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage() {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(ConfigService, makeConfigService())),
    );
    return render(<Page />);
  }

  test("renders heading and description", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /konfigurasi/i })).toBeInTheDocument();
    expect(screen.getByText(/atur konfigurasi aplikasi/i)).toBeInTheDocument();
  });

  test("renders 'Tampilan' section heading", () => {
    renderPage();
    expect(screen.getByText("Tampilan")).toBeInTheDocument();
  });

  test("renders Size and Theme selects", () => {
    renderPage();
    expect(screen.getByText("Ukuran")).toBeInTheDocument();
    expect(screen.getByText("Tema")).toBeInTheDocument();
  });
});
