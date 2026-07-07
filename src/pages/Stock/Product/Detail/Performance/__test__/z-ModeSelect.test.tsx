import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSelect } from "../z-ModeSelect";
import { render } from "~/lib/render";

// ── Rendering ─────────────────────────────────────────────────

describe("ModeSelect", () => {
  test("renders Penambahan and Pengurangan radio buttons", () => {
    render(<ModeSelect />);

    expect(screen.getByLabelText("Penambahan")).not.toBeNull();
    expect(screen.getByLabelText("Pengurangan")).not.toBeNull();
  });

  test("Penambahan is selected by default", () => {
    render(<ModeSelect />);

    const positiveRadio = screen.getByLabelText("Penambahan") as HTMLInputElement;
    // Radio button should be in checked state via aria-checked or data-state
    const radioItem = positiveRadio.closest("[data-state]");
    expect(radioItem?.getAttribute("data-state")).toBe("checked");
  });

  test("clicking Pengurangan switches selection", async () => {
    const user = userEvent.setup();
    render(<ModeSelect />);

    const negativeLabel = screen.getByLabelText("Pengurangan");
    await user.click(negativeLabel);

    // After clicking, Pengurangan should be checked
    const radioItem = negativeLabel.closest("[data-state]");
    await screen.findByText("Pengurangan");
    expect(radioItem?.getAttribute("data-state")).toBe("checked");
  });
});
