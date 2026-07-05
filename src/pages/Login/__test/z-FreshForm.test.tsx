import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect } from "effect";
import { FreshForm } from "../z-FreshForm";
import { render } from "~/lib/render";
import { CashierError } from "~/services/cashier";
import type { Cashier } from "~/services/cashier";

const mockUser: Cashier = { name: "Admin", role: "admin" as const, id: "1" };

describe("FreshForm", () => {
  function renderForm(opts?: {
    onAdd?: (
      name: string,
      password: string,
    ) => Effect.Effect<Cashier, CashierError>;
    login?: (user: Cashier) => void;
  }) {
    return render(
      <FreshForm
        onAdd={
          opts?.onAdd ?? (() => Effect.succeed(mockUser))
        }
        login={opts?.login ?? (() => {})}
      />,
    );
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  test("renders heading 'Selamat Datang'", () => {
    renderForm();
    expect(screen.getByText(/selamat datang/i)).not.toBeNull();
  });

  test("renders instruction text", () => {
    renderForm();
    expect(
      screen.getByText(/silakan buat akun terlebih/i),
    ).not.toBeNull();
  });

  test("renders name, password, and confirm password fields", () => {
    renderForm();
    expect(screen.getByLabelText("Nama")).not.toBeNull();
    expect(screen.getByLabelText("Kata sandi")).not.toBeNull();
    expect(screen.getByLabelText("Ulangi kata sandi")).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  test("shows validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "different");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(
      await screen.findByText(/kata sandi tidak sesuai/i),
    ).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  test("shows error when onAdd fails", async () => {
    const user = userEvent.setup();
    renderForm({
      onAdd: () =>
        Effect.fail(new CashierError(new Error("Nama sudah dipakai"))),
    });

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "secret123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // Success state
  // -----------------------------------------------------------------------

  test("calls login with created user on success", async () => {
    const user = userEvent.setup();
    const login = mock((_user: Cashier) => {});
    renderForm({ login });

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "secret123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(mockUser);
    });
  });
});
