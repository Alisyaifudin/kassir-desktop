import { describe, test, expect } from "bun:test";
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
    expect(screen.getByRole("heading", { name: "Masuk" })).not.toBeNull();
  });

  test("renders password field", () => {
    renderForm();
    expect(screen.getByLabelText("Kata sandi")).not.toBeNull();
  });

  test("submit button starts disabled", () => {
    renderForm();
    expect((screen.getByRole("button", { name: /masuk/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("shows error when onCheck fails", async () => {
    const user = userEvent.setup();
    renderForm({ onCheck: () => Effect.fail(new InvalidPassword(new Error("Kata sandi salah"))) });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Budi" }));
    await user.type(screen.getByLabelText("Kata sandi"), "wrong");
    fireEvent.submit(document.querySelector("form")!);

    expect(await screen.findByText("Kata sandi salah")).not.toBeNull();
  });
});
