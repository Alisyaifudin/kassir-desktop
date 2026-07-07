import { describe, test, expect } from "bun:test";
import { screen, waitFor, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { SelectPrinter } from "../z-SelectPrinter";
import type { Printer } from "~/services/print/type";
import { Listener } from "~/lib/state";

const printers: Printer[] = [
  { id: "p1", name: "Printer A" },
  { id: "p2", name: "Printer B" },
];

class StatefullPrinter {
  printer: Printer | null = printers[0];
  listeners = new Set<Listener>();
  getSnapshot() { return this.printer; }
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
  notify() { this.listeners.forEach((l) => l()); }
  setPrinter(p: Printer) { this.printer = p; this.notify(); }
  usePrinter() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore((cb) => this.subscribe(cb), () => this.getSnapshot());
  }
}

describe("SelectPrinter", () => {
  test("renders label", () => {
    render(
      <SelectPrinter printers={printers} printer={printers[0]} onSetPrinter={async () => null} />,
    );
    expect(screen.getByText("Printer Terpilih")).not.toBeNull();
  });

  test("shows printer name", () => {
    render(
      <SelectPrinter printers={printers} printer={printers[1]} onSetPrinter={async () => null} />,
    );
    expect(screen.getByRole("combobox").textContent).toContain("Printer B");
  });

  test("shows error when set fails", async () => {
    const user = userEvent.setup();
    render(
      <SelectPrinter printers={printers} printer={printers[0]} onSetPrinter={async () => "Gagal menyimpan"} />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Printer B" }));
    expect(await screen.findByText("Gagal menyimpan")).not.toBeNull();
  });

  test("successful printer selection shows no error", async () => {
    const user = userEvent.setup();
    render(
      <SelectPrinter printers={printers} printer={printers[0]} onSetPrinter={async () => null} />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Printer B" }));
    await waitFor(() => {
      expect(screen.queryByText(/gagal/i)).toBeNull();
    });
  });
});
