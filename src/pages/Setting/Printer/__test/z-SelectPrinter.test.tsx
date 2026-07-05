import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SelectPrinter } from "../z-SelectPrinter";
import { render } from "~/lib/render";
import type { Printer } from "~/services/print/type";

const printers: Printer[] = [
  { id: "p1", name: "Printer A" },
  { id: "p2", name: "Printer B" },
];

describe("SelectPrinter", () => {
  function renderSelect(opts?: {
    printers?: Printer[];
    printer?: Printer | null;
    onSetPrinter?: (p: Printer) => Promise<string | null>;
  }) {
    return render(
      <SelectPrinter
        printers={opts?.printers ?? printers}
        printer={opts?.printer ?? printers[0]}
        onSetPrinter={opts?.onSetPrinter ?? (() => Promise.resolve(null))}
      />,
    );
  }

  test("renders label and description", () => {
    renderSelect();
    expect(screen.getByText("Printer Terpilih")).toBeInTheDocument();
  });

  test("shows selected printer name", () => {
    renderSelect({ printer: printers[1] });
    expect(screen.getByText("Printer B")).toBeInTheDocument();
  });

  test("calls onSetPrinter when selecting different printer", async () => {
    const onSet = mock(async (_p: Printer) => null);
    const user = userEvent.setup();
    renderSelect({ printer: printers[0], onSetPrinter: onSet });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Printer B" }));

    await waitFor(() => expect(onSet).toHaveBeenCalledWith(printers[1]));
  });

  test("select updates displayed value after selection", async () => {
    const user = userEvent.setup();
    render(<StatefulSelectPrinter />);

    // Initially shows "Printer A"
    expect(screen.getByRole("combobox")).toHaveTextContent("Printer A");

    // Select "Printer B"
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Printer B" }));

    // Trigger now shows "Printer B"
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Printer B");
    });
  });

  test("shows error when set fails", async () => {
    const onSet = mock(async () => "Gagal menyimpan");
    const user = userEvent.setup();
    renderSelect({ printer: printers[0], onSetPrinter: onSet });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Printer B" }));

    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument();
  });
});

function StatefulSelectPrinter() {
  const [printer, setPrinter] = useState<Printer | null>(printers[0]);
  return (
    <SelectPrinter
      printers={printers}
      printer={printer}
      onSetPrinter={async (p) => { setPrinter(p); return null; }}
    />
  );
}
