import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
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

  test("shows error when clear fails", async () => {
    const user = userEvent.setup();
    renderBtn(async () => "Gagal membersihkan");
    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(await screen.findByText("Gagal membersihkan")).toBeInTheDocument();
  });
});
