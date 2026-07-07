import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrinterWidth } from "../z-PrinterWidth";
import { render } from "~/lib/render";

describe("PrinterWidth", () => {
  test("renders label", () => {
    render(<PrinterWidth size={80} onSetSize={async () => null} />);
    expect(screen.getByText(/lebar struk/i)).not.toBeNull();
  });

  test("shows current size as default value", () => {
    render(<PrinterWidth size={58} onSetSize={async () => null} />);
    expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("58");
  });

  test("shows error when save fails", async () => {
    const user = userEvent.setup();
    render(<PrinterWidth size={80} onSetSize={async () => "Gagal menyimpan"} />);
    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText("Gagal menyimpan")).not.toBeNull();
  });

  test("saves successfully without error", async () => {
    const user = userEvent.setup();
    render(<PrinterWidth size={80} onSetSize={async () => null} />);
    await user.click(screen.getByRole("button", { name: /simpan/i }));
    await waitFor(() => {
      expect(screen.queryByText(/gagal/i)).toBeNull();
    });
  });

  test("shows validation error when width is below minimum", async () => {
    const user = userEvent.setup();
    render(<PrinterWidth size={80} onSetSize={async () => null} />);
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "5");
    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText(/minimal 10mm/i)).not.toBeNull();
  });

  test("shows validation error when width exceeds maximum", async () => {
    const user = userEvent.setup();
    render(<PrinterWidth size={80} onSetSize={async () => null} />);
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "300");
    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText(/maksimal 200mm/i)).not.toBeNull();
  });
});
