import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import type { Theme } from "~/services/config";
import { SelectTheme } from "../z-SelectTheme";
import { render } from "~/lib/render";
import { Listener } from "~/lib/state";

class StatefullTheme {
  theme: Theme = "light";
  listeners = new Set<Listener>();
  getSnapshot() { return this.theme; }
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
  notify() { this.listeners.forEach((l) => l()); }
  setTheme(theme: Theme) { this.theme = theme; this.notify(); }
  useTheme() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore((cb) => this.subscribe(cb), () => this.getSnapshot());
  }
}

describe("SelectTheme", () => {
  const combobox = () => screen.getByRole("combobox", { name: "Tema" });

  function renderSelect(useTheme?: () => Theme, onSetTheme?: (t: Theme) => void) {
    return render(
      <SelectTheme useTheme={useTheme ?? (() => "light")} onSetTheme={onSetTheme ?? (() => {})} />,
    );
  }

  test("renders 'Tema' label", () => {
    renderSelect();
    expect(screen.getByText("Tema")).not.toBeNull();
  });

  test("shows 'Terang' when theme is light", () => {
    renderSelect(() => "light");
    expect(combobox().textContent).toContain("Terang");
  });

  test("shows 'Gelap' when theme is dark", () => {
    renderSelect(() => "dark");
    expect(combobox().textContent).toContain("Gelap");
  });

  test("updates displayed value after selecting Gelap", async () => {
    const user = userEvent.setup();
    const state = new StatefullTheme();
    renderSelect(() => state.useTheme(), (t) => state.setTheme(t));

    expect(combobox().textContent).toContain("Terang");

    await user.click(combobox());
    await user.click(await screen.findByRole("option", { name: "Gelap" }));

    await waitFor(() => {
      expect(combobox().textContent).toContain("Gelap");
    });
  });
});
