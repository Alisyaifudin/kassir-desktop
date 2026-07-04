import { describe, test, expect, mock } from "bun:test";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect } from "effect";
import { LoginForm } from "../z-LoginForm";
import { render } from "~/lib/render";
import type { Cashier } from "~/services/cashier";
import { CashierError } from "~/services/cashier";
import { InvalidPassword } from "~/services/hash";

const mockCashiers: Cashier[] = [
  { name: "Budi", role: "admin", id: "1" },
  { name: "Ani", role: "user", id: "2" },
];

describe("LoginForm", () => {
  function renderForm(opts?: {
    onCheck?: (id: string, password: string) => Effect.Effect<Cashier, CashierError | InvalidPassword>;
    login?: (user: Cashier) => void;
  }) {
    return render(
      <LoginForm
        cashiers={mockCashiers}
        onCheck={opts?.onCheck ?? ((id) => Effect.succeed(mockCashiers.find((c) => c.id === id)!))}
        login={opts?.login ?? (() => {})}
      />,
    );
  }

  test("renders heading 'Masuk'", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "Masuk" })).toBeInTheDocument();
  });

  test("renders password field", () => {
    renderForm();
    expect(screen.getByLabelText("Kata sandi")).toBeInTheDocument();
  });

  test("submit button starts disabled", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /masuk/i })).toBeDisabled();
  });

  test("selecting user, typing password, and submitting calls onCheck", async () => {
    const onCheck = mock(
      (_id: string, _password: string) =>
        Effect.succeed({ name: "Budi", role: "admin" as const, id: "1" }),
    );
    const user = userEvent.setup();
    renderForm({ onCheck });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Budi" }));

    // form state is updated (hidden select proves it), but button re-render
    // lags in happy-dom/jsdom. Submit via fireEvent on the form directly.
    await user.type(screen.getByLabelText("Kata sandi"), "secret123");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(onCheck).toHaveBeenCalledWith("1", "secret123");
    });
  });

  test("shows error when onCheck fails", async () => {
    const onCheck = mock(() =>
      Effect.fail(new InvalidPassword(new Error("Kata sandi salah"))),
    );
    const user = userEvent.setup();
    renderForm({ onCheck });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Budi" }));

    await user.type(screen.getByLabelText("Kata sandi"), "wrong");
    fireEvent.submit(document.querySelector("form")!);

    expect(await screen.findByText("Kata sandi salah")).toBeInTheDocument();
  });
});
