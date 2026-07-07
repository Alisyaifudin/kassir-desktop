import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestBtn } from "../z-TestBtn";
import { render } from "~/lib/render";

describe("TestBtn", () => {
  test("renders 'Tes Cetak' button", () => {
    render(<TestBtn print={async () => null} />);
    expect(screen.getByRole("button", { name: /tes cetak/i })).not.toBeNull();
  });

  test("shows no error on successful print", async () => {
    const user = userEvent.setup();
    render(<TestBtn print={async () => null} />);
    await user.click(screen.getByRole("button", { name: /tes cetak/i }));
    expect(screen.queryByText(/error/i)).toBeNull();
  });

  test("shows error when print fails", async () => {
    const user = userEvent.setup();
    render(<TestBtn print={async () => "Printer error"} />);
    await user.click(screen.getByRole("button", { name: /tes cetak/i }));
    expect(await screen.findByText("Printer error")).not.toBeNull();
  });
});
