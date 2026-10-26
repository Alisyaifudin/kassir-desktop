import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { CartStartError } from "./z-StartError";

/**
 * Shown when a screen could not open its first cart — a locked or unreadable
 * `tx.db`. Without it the page sat on an endless spinner with nothing to read and
 * no way to sell; the retry button is the only way out.
 */
describe("CartStartError", () => {
  test("says what failed and what to do", () => {
    render(<CartStartError message="Database terkunci" onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Tidak bisa memulai transaksi")).toBeDefined();
    expect(screen.getByText("Database terkunci")).toBeDefined();
  });

  test("Coba lagi asks the screen to try again", () => {
    let retried = 0;
    render(<CartStartError message="putus" onRetry={() => (retried += 1)} />);

    fireEvent.click(screen.getByRole("button", { name: /Coba lagi/ }));

    expect(retried).toBe(1);
  });
});
