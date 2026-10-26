import { describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import Decimal from "decimal.js";
import { Total } from "./z-Total";

/**
 * The one number the cashier reads before paying. It is on screen from the first
 * frame: the `Rp` and the box are static, and only the amount pulses in place
 * while the draft loads — after the anti-flash window, so a fast read never
 * flashes a placeholder.
 */
describe("Total", () => {
  test("an arrived total prints rupiah at the draft's precision", () => {
    render(<Total grand={new Decimal(1_000_000)} fix={0} />);

    expect(screen.getByTestId("grand-total").textContent).toBe("Rp1.000.000");
    expect(screen.queryByText("Rp", { selector: "[data-slot=skeleton]" })).toBeNull();
  });

  test("the precision decides the decimals", () => {
    render(<Total grand={new Decimal("1000.5")} fix={2} />);
    expect(screen.getByTestId("grand-total").textContent).toBe("Rp1.000,5");
  });

  test("before the draft arrives there is the label and a pulsing box, no amount", () => {
    const { container } = render(<Total grand={null} fix={0} />);

    const total = screen.getByTestId("grand-total");
    expect(total.textContent).toContain("Rp");
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    // No digits yet: the amount cannot be read while it is unknown.
    expect(total.textContent).not.toMatch(/\d/);
  });

  test("the placeholder is held back for the anti-flash window", async () => {
    const { container } = render(<Total grand={null} fix={0} />);
    const holder = container.querySelector('[data-slot="skeleton"]')?.parentElement;

    // Invisible but occupying its space from the first frame.
    expect(holder?.getAttribute("aria-hidden")).toBe("true");

    await waitFor(() => expect(holder?.getAttribute("aria-hidden")).toBe("false"), {
      timeout: 1_000,
    });
  });
});
