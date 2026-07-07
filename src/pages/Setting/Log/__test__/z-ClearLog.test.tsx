import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearLog } from "../z-ClearLog";
import { render } from "~/lib/render";

describe("ClearLog", () => {
  test("renders 'Bersihkan' button", () => {
    render(<ClearLog onClear={async () => null} />);
    expect(screen.getByRole("button", { name: /bersihkan/i })).not.toBeNull();
  });

  test("clears successfully without error", async () => {
    const user = userEvent.setup();
    render(<ClearLog onClear={async () => null} />);
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(screen.queryByText(/gagal/i)).toBeNull();
  });

  test("shows error when clear fails", async () => {
    const user = userEvent.setup();
    render(<ClearLog onClear={async () => "Gagal membersihkan"} />);
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(await screen.findByText("Gagal membersihkan")).not.toBeNull();
  });
});
