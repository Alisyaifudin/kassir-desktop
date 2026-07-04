import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect } from "effect";
import { FreshForm } from "../z-FreshForm";
import { render } from "~/lib/render";
import { Cashier, CashierError } from "~/services/cashier";

describe("FreshForm", () => {
  function renderForm(opts?: {
    onAdd?: (name: string, password: string) => Effect.Effect<Cashier, CashierError>;
    login?: (user: unknown) => void;
  }) {
    return render(
      <FreshForm
        onAdd={
          opts?.onAdd ?? (() => Effect.succeed({ name: "Admin", role: "admin" as const, id: "1" }))
        }
        login={opts?.login ?? (() => {})}
      />,
    );
  }

  test("renders heading 'Selamat Datang'", () => {
    renderForm();
    expect(screen.getByText(/selamat datang/i)).toBeInTheDocument();
  });

  test("renders instruction text", () => {
    renderForm();
    expect(screen.getByText(/silakan buat akun terlebih/i)).toBeInTheDocument();
  });

  test("renders name, password, and confirm password fields", () => {
    renderForm();
    expect(screen.getByLabelText("Nama")).toBeInTheDocument();
    expect(screen.getByLabelText("Kata sandi")).toBeInTheDocument();
    expect(screen.getByLabelText("Ulangi kata sandi")).toBeInTheDocument();
  });

  test("submitting form calls onAdd with name and password", async () => {
    const onAdd = mock((_name: string, _password: string) =>
      Effect.succeed({ name: "Admin", role: "admin" as const, id: "1" }),
    );
    const user = userEvent.setup();
    renderForm({ onAdd });

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "secret123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("Admin", "secret123");
    });
  });

  test("calls login on successful add", async () => {
    const login = mock((_user: unknown) => {});
    const user = userEvent.setup();
    renderForm({ login });

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "secret123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
    });
  });

  test("shows error when onAdd fails", async () => {
    const onAdd = mock(() => Effect.fail(new CashierError(new Error("Nama sudah dipakai"))));
    const user = userEvent.setup();
    renderForm({ onAdd });

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "secret123");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText("Nama sudah dipakai")).toBeInTheDocument();
  });

  test("shows validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Nama"), "Admin");
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    await user.type(screen.getByLabelText("Ulangi kata sandi"), "different");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText(/kata sandi tidak sesuai/i)).toBeInTheDocument();
  });
});
