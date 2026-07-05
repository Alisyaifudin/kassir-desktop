import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrinterWidth } from "../z-PrinterWidth";
import { render } from "~/lib/render";

describe("PrinterWidth", () => {
  test("renders label", () => {
    render(<PrinterWidth size={80} onSetSize={async () => null} />);
    expect(screen.getByText(/lebar struk/i)).toBeInTheDocument();
  });

  test("shows current size as default value", () => {
    render(<PrinterWidth size={58} onSetSize={async () => null} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(58);
  });

  test("shows error when save fails", async () => {
    const user = userEvent.setup();
    render(<PrinterWidth size={80} onSetSize={async () => "Gagal menyimpan"} />);
    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument();
  });
});
