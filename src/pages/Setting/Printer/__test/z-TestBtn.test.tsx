import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestBtn } from "../z-TestBtn";
import { render } from "~/lib/render";

describe("TestBtn", () => {
  function renderBtn(print?: () => Promise<string | null>) {
    return render(<TestBtn print={print ?? (() => Promise.resolve(null))} />);
  }

  test("renders 'Tes Cetak' button", () => {
    renderBtn();
    expect(screen.getByRole("button", { name: /tes cetak/i })).toBeInTheDocument();
  });

  test("calls print when clicked", async () => {
    const print = mock(async () => null);
    const user = userEvent.setup();
    renderBtn(print);
    await user.click(screen.getByRole("button", { name: /tes cetak/i }));
    await waitFor(() => expect(print).toHaveBeenCalled());
  });

  test("shows error when print fails", async () => {
    const print = mock(async () => "Printer error");
    const user = userEvent.setup();
    renderBtn(print);
    await user.click(screen.getByRole("button", { name: /tes cetak/i }));
    expect(await screen.findByText("Printer error")).toBeInTheDocument();
  });
});
