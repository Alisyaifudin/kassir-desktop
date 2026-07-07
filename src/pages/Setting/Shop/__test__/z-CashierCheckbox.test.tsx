import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashierCheckbox } from "../z-CashierCheckbox";
import { render } from "~/lib/render";

describe("CashierCheckbox", () => {
  test("renders label text", () => {
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => null} />);
    expect(screen.getByText(/tampilkan nama kasir/i)).not.toBeNull();
  });

  test("checkbox is checked when showCashier is true", () => {
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => null} />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
  });

  test("checkbox is unchecked when showCashier is false", () => {
    render(<CashierCheckbox showCashier={false} onSetShowCashier={async () => null} />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
  });

  test("shows error when update fails", async () => {
    const user = userEvent.setup();
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => "Gagal menyimpan"} />);
    await user.click(screen.getByRole("checkbox"));
    expect(await screen.findByText("Gagal menyimpan")).not.toBeNull();
  });

  test("successful toggle shows no error", async () => {
    const user = userEvent.setup();
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => null} />);
    await user.click(screen.getByRole("checkbox"));
    await waitFor(() => {
      expect(screen.queryByText(/gagal/i)).toBeNull();
    });
  });
});
