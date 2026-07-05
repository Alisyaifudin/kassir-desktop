import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect, Layer } from "effect";
import { useSyncExternalStore } from "react";
import { ConfigService } from "~/services/config";
import type { Size, Theme } from "~/services/config";
import page from "../page";
import { render } from "~/lib/render";
import { Listener } from "~/lib/state";

// ---------------------------------------------------------------------------
// Stateful mocks — mirror the real DataState pattern via useSyncExternalStore
// ---------------------------------------------------------------------------

class StatefullSize {
  size: Size = "big";
  listeners = new Set<Listener>();
  getSnapshot() { return this.size; }
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
  notify() { this.listeners.forEach((l) => l()); }
  set(s: Size) { this.size = s; this.notify(); }
  useSize() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore((cb) => this.subscribe(cb), () => this.getSnapshot());
  }
}

class StatefullTheme {
  theme: Theme = "light";
  listeners = new Set<Listener>();
  getSnapshot() { return this.theme; }
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
  notify() { this.listeners.forEach((l) => l()); }
  set(t: Theme) { this.theme = t; this.notify(); }
  useTheme() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore((cb) => this.subscribe(cb), () => this.getSnapshot());
  }
}

function makeConfigService(opts: {
  size: StatefullSize;
  theme: StatefullTheme;
}): typeof ConfigService.Service {
  return {
    size: {
      useSize: () => opts.size.useSize(),
      set: (s) => opts.size.set(s),
    },
    theme: {
      useTheme: () => opts.theme.useTheme(),
      set: (t) => opts.theme.set(t),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when ConfigService is provided", () => {
    const size = new StatefullSize();
    const theme = new StatefullTheme();
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(ConfigService, makeConfigService({ size, theme }));
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage(opts?: { size?: StatefullSize; theme?: StatefullTheme }) {
    const size = opts?.size ?? new StatefullSize();
    const theme = opts?.theme ?? new StatefullTheme();
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(ConfigService, makeConfigService({ size, theme }))),
    );
    return render(<Page />);
  }

  test("renders heading and description", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /konfigurasi/i })).not.toBeNull();
    expect(screen.getByText(/atur konfigurasi aplikasi/i)).not.toBeNull();
  });

  test("renders 'Tampilan' section heading", () => {
    renderPage();
    expect(screen.getByText("Tampilan")).not.toBeNull();
  });

  test("shows initial size and theme from service", () => {
    const size = new StatefullSize();
    size.set("small");
    const theme = new StatefullTheme();
    theme.set("dark");
    renderPage({ size, theme });

    expect(screen.getByRole("combobox", { name: "Ukuran" }).textContent).toContain("Kecil");
    expect(screen.getByRole("combobox", { name: "Tema" }).textContent).toContain("Gelap");
  });

  test("size select round-trip through service injection", async () => {
    const user = userEvent.setup();
    const size = new StatefullSize();
    const theme = new StatefullTheme();
    renderPage({ size, theme });

    const sizeTrigger = screen.getByRole("combobox", { name: "Ukuran" });
    expect(sizeTrigger.textContent).toContain("Besar");

    await user.click(sizeTrigger);
    await user.click(await screen.findByRole("option", { name: "Kecil" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Ukuran" }).textContent).toContain("Kecil");
    });
  });

  test("theme select round-trip through service injection", async () => {
    const user = userEvent.setup();
    const size = new StatefullSize();
    const theme = new StatefullTheme();
    renderPage({ size, theme });

    const themeTrigger = screen.getByRole("combobox", { name: "Tema" });
    expect(themeTrigger.textContent).toContain("Terang");

    await user.click(themeTrigger);
    await user.click(await screen.findByRole("option", { name: "Gelap" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Tema" }).textContent).toContain("Gelap");
    });
  });
});
