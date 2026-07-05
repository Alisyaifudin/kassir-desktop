import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashierCheckbox } from "../z-CashierCheckbox";
import { render } from "~/lib/render";

describe("CashierCheckbox", () => {
  test("renders label text", () => {
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => null} />);
    expect(screen.getByText(/tampilkan nama kasir/i)).toBeInTheDocument();
  });

  test("checkbox is checked when showCashier is true", () => {
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => null} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  test("checkbox is unchecked when showCashier is false", () => {
    render(<CashierCheckbox showCashier={false} onSetShowCashier={async () => null} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  test("shows error when update fails", async () => {
    const user = userEvent.setup();
    render(<CashierCheckbox showCashier={true} onSetShowCashier={async () => "Gagal menyimpan"} />);
    await user.click(screen.getByRole("checkbox"));
    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument();
  });
});
