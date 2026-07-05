import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordForm } from "../z-PasswordForm";
import { render } from "~/lib/render";

describe("PasswordForm", () => {
  test("renders 'Ganti kata sandi' trigger", () => {
    render(<PasswordForm userId="1" sonner={{ error: () => {}, success: () => {} }} onUpdatePassword={async () => null} />);
    expect(screen.getByText(/ganti kata sandi/i)).not.toBeNull();
  });

  test("expands form and shows password input on click", async () => {
    const user = userEvent.setup();
    render(<PasswordForm userId="1" sonner={{ error: () => {}, success: () => {} }} onUpdatePassword={async () => null} />);
    await user.click(screen.getByText(/ganti kata sandi/i));
    // Accordion content has "Kata Sandi Baru" label visible after expanding
    expect(await screen.findByText(/kata sandi baru/i)).not.toBeNull();
  });

  test("shows error when update fails", async () => {
    const user = userEvent.setup();
    render(<PasswordForm userId="1" sonner={{ error: () => {}, success: () => {} }} onUpdatePassword={async () => "Kata sandi terlalu pendek"} />);

    await user.click(screen.getByText(/ganti kata sandi/i));
    await screen.findByText(/kata sandi baru/i);
    const input = screen.getByDisplayValue("");
    await user.type(input, "123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText("Kata sandi terlalu pendek")).not.toBeNull();
  });
});
