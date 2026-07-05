import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordForm } from "../z-PasswordForm";
import { render } from "~/lib/render";

describe("PasswordForm", () => {
  function renderForm(opts?: {
    userId?: string;
    onUpdatePassword?: (id: string, password: string) => Promise<string | null>;
  }) {
    return render(
      <PasswordForm
        userId={opts?.userId ?? "1"}
        onUpdatePassword={opts?.onUpdatePassword ?? (() => Promise.resolve(null))}
      />,
    );
  }

  test("renders 'Ganti kata sandi' trigger", () => {
    renderForm();
    expect(screen.getByText(/ganti kata sandi/i)).toBeInTheDocument();
  });

  test("expands form on click", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByText(/ganti kata sandi/i));
    expect(await screen.findByLabelText(/kata sandi baru/i)).toBeInTheDocument();
  });

  test("calls onUpdatePassword on submit", async () => {
    const onUpdate = mock(async (_id: string, _pw: string) => null);
    const user = userEvent.setup();
    renderForm({ onUpdatePassword: onUpdate });

    await user.click(screen.getByText(/ganti kata sandi/i));
    const input = await screen.findByLabelText(/kata sandi baru/i);
    await user.type(input, "newpassword123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("1", "newpassword123"));
  });

  test("shows error when update fails", async () => {
    const onUpdate = mock(async () => "Kata sandi terlalu pendek");
    const user = userEvent.setup();
    renderForm({ onUpdatePassword: onUpdate });

    await user.click(screen.getByText(/ganti kata sandi/i));
    const input = await screen.findByLabelText(/kata sandi baru/i);
    await user.type(input, "123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText("Kata sandi terlalu pendek")).toBeInTheDocument();
  });
});
