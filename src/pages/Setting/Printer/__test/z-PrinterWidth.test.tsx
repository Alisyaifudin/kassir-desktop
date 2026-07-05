import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrinterWidth } from "../z-PrinterWidth";
import { render } from "~/lib/render";

describe("PrinterWidth", () => {
  function renderForm(opts?: {
    size?: number;
    onSetSize?: (size: number) => Promise<string | null>;
  }) {
    return render(
      <PrinterWidth size={opts?.size ?? 80} onSetSize={opts?.onSetSize ?? (() => Promise.resolve(null))} />,
    );
  }

  test("renders label and description", () => {
    renderForm();
    expect(screen.getByText(/lebar struk/i)).toBeInTheDocument();
  });

  test("shows current size as default value", () => {
    renderForm({ size: 58 });
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("58");
  });

  test("calls onSetSize with parsed value on submit", async () => {
    const onSet = mock(async (_s: number) => null);
    const user = userEvent.setup();
    renderForm({ size: 80, onSetSize: onSet });

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "50");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => expect(onSet).toHaveBeenCalledWith(50));
  });

  test("shows error when set fails", async () => {
    const onSet = mock(async () => "Gagal menyimpan");
    const user = userEvent.setup();
    renderForm({ onSetSize: onSet });

    await user.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument();
  });
});
