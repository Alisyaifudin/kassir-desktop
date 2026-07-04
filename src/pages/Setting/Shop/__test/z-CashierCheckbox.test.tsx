import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashierCheckbox } from "../z-CashierCheckbox";
import { render } from "~/lib/render";

describe("CashierCheckbox", () => {
  function renderCheckbox(opts?: {
    showCashier?: boolean;
    onSetShowCashier?: (val: boolean) => Promise<string | null>;
  }) {
    return render(
      <CashierCheckbox
        showCashier={opts?.showCashier ?? true}
        onSetShowCashier={opts?.onSetShowCashier ?? (() => Promise.resolve(null))}
      />,
    );
  }

  test("renders label text", () => {
    renderCheckbox();
    expect(screen.getByText(/tampilkan nama kasir/i)).toBeInTheDocument();
  });

  test("calls onSetShowCashier when toggled", async () => {
    const onSet = mock(async (_val: boolean) => null);
    const user = userEvent.setup();
    renderCheckbox({ onSetShowCashier: onSet });

    await user.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(onSet).toHaveBeenCalledWith(false));
  });

  test("shows error when onSetShowCashier returns error", async () => {
    const onSet = mock(async () => "Gagal menyimpan");
    const user = userEvent.setup();
    renderCheckbox({ onSetShowCashier: onSet });

    await user.click(screen.getByRole("checkbox"));
    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument();
  });
});
