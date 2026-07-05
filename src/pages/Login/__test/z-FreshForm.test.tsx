import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect } from "effect";
import { FreshForm } from "../z-FreshForm";
import { render } from "~/lib/render";
import { CashierError } from "~/services/cashier";

describe("FreshForm", () => {
  function renderForm(opts?: {
    onAdd?: (name: string, password: string) => Effect.Effect<{ name: string; role: DBNamespace.Role; id: string }, CashierError>;
    login?: (user: unknown) => void;
  }) {
    return render(
      <FreshForm
        onAdd={opts?.onAdd ?? (() => Effect.succeed({ name: "Admin", role: "admin" as const, id: "1" }))}
        login={opts?.login ?? (() => {})}
      />,
    );
  }

  test("renders heading 'Selamat Datang'", () => {
    renderForm();
    expect(screen.getByText(/selamat datang/i)).not.toBeNull();
  });

  test("renders instruction text", () => {
    renderForm();
    expect(screen.getByText(/silakan buat akun terlebih/i)).not.toBeNull();
  });

  test("renders name, password, and confirm password fields", () => {
    renderForm();
    expect(screen.getByLabelText("Nama")).not.toBeNull();
    expect(screen.getByLabelText("Kata sandi")).not.toBeNull();
    expect(screen.getByLabelText("Ulangi kata sandi")).not.toBeNull();
  });

  test("shows error when onAdd fails", async () => {
    const user = userEvent.setup();
    renderForm({ onAdd: () => Effect.fail(new CashierError(new Error("Nama sudah dipakai"))) });

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "secret123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("shows validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "different");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText(/kata sandi tidak sesuai/i)).not.toBeNull();
  });
});
