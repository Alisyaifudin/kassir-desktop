import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearLog } from "../z-ClearLog";
import { render } from "~/lib/render";

describe("ClearLog", () => {
  function renderBtn(onClear?: () => Promise<string | null>) {
    return render(<ClearLog onClear={onClear ?? (() => Promise.resolve(null))} />);
  }

  test("renders 'Bersihkan' button", () => {
    renderBtn();
    expect(screen.getByRole("button", { name: /bersihkan/i })).toBeInTheDocument();
  });

  test("calls onClear when clicked", async () => {
    const onClear = mock(async () => null);
    const user = userEvent.setup();
    renderBtn(onClear);
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    await waitFor(() => expect(onClear).toHaveBeenCalled());
  });

  test("shows error when onClear returns error", async () => {
    const onClear = mock(async () => "Gagal membersihkan");
    const user = userEvent.setup();
    renderBtn(onClear);
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(await screen.findByText("Gagal membersihkan")).toBeInTheDocument();
  });
});
