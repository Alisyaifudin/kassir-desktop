import { describe, test, expect } from "bun:test";
import { screen, waitFor, render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import type { Size } from "~/services/config";
import { SelectSize } from "../z-SelectSize";
import { Listener } from "~/lib/state";

class StatefullSize {
  size: Size = "small";
  listeners = new Set<Listener>();
  getSnapshot() {
    return this.size;
  }
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  notify() {
    this.listeners.forEach((l) => l());
  }
  setSize(size: Size) {
    this.size = size;
    this.notify();
  }
  useSize() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      (cb) => this.subscribe(cb),
      () => this.getSnapshot(),
    );
  }
}

describe("SelectSize", () => {
  function renderSelect(useSize?: () => Size, onSetSize?: (s: Size) => void) {
    return rtlRender(
      <SelectSize useSize={useSize ?? (() => "big")} onSetSize={onSetSize ?? (() => {})} />,
    );
  }

  test("renders 'Ukuran' label", () => {
    renderSelect();
    expect(screen.getByText("Ukuran")).not.toBeNull();
  });

  test("shows 'Besar' when size is big", () => {
    renderSelect(() => "big");
    expect(screen.getByRole("combobox").textContent).toContain("Besar");
  });

  test("shows 'Kecil' when size is small", () => {
    renderSelect(() => "small");
    expect(screen.getByRole("combobox").textContent).toContain("Kecil");
  });

  test("updates displayed value after selecting Kecil", async () => {
    const user = userEvent.setup();
    const state = new StatefullSize();
    const useSize = () => state.useSize();
    const onSetSize = (size: Size) => state.setSize(size);
    renderSelect(useSize, onSetSize);

    expect(screen.getByRole("combobox").textContent).toContain("Kecil");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Besar" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox").textContent).toContain("Besar");
    });
  });
});
