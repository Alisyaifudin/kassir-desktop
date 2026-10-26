import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SelectCell } from "./z-SelectCell";

/**
 * Choosing from a method cell must close the menu, not bounce it.
 *
 * The menu is a portal, so its DOM sits outside the cell — but React still
 * bubbles its events back up the tree, and Radix selects on `pointerup` and
 * closes *before* the trailing `click` lands. By the time that click reaches the
 * cell, the render that ended editing has already happened, so the cell sees a
 * plain "someone clicked me" and asks to edit again: the menu closes and
 * reopens, and only a click outside dismisses it.
 *
 * A keyboard-opened menu is the same state the browser is in at that moment
 * (open, cell not editing), so the close is observed the same way.
 */
const OPTIONS = [
  { value: "cash", label: "Tunai" },
  { value: "qris", label: "QRIS" },
] as const;

function Harness() {
  const [value, setValue] = useState<string>("cash");
  const [editing, setEditing] = useState(false);
  return (
    <SelectCell
      id="cell-payment-kind"
      label="Metode"
      selected
      editing={editing}
      value={value}
      options={OPTIONS}
      onSelect={() => setEditing(true)}
      onEditingDone={() => setEditing(false)}
      onChange={setValue}
    />
  );
}

async function openMenu() {
  const trigger = screen.getByRole("combobox");
  // The keyboard opens the menu without the cell asking to edit.
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
  return trigger;
}

describe("SelectCell", () => {
  test("a click on the cell opens the menu", async () => {
    render(<Harness />);
    // Hold the trigger: once the menu is open Radix hides the rest of the page
    // from the accessibility tree, so it is no longer findable by role.
    const trigger = screen.getByRole("combobox");

    fireEvent.click(trigger);

    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    expect(trigger.textContent).toContain("Tunai");
  });

  test("choosing an option closes the menu and leaves it closed", async () => {
    render(<Harness />);
    const trigger = await openMenu();

    fireEvent.click(await screen.findByRole("option", { name: "QRIS" }));

    // The menu picks the value...
    await waitFor(() => expect(trigger.textContent).toContain("QRIS"));
    // ...and stays shut. Before the guard it reopened on the trailing click,
    // because the cell was no longer editing and asked for the editor back.
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("option", { name: "Tunai" })).toBeNull();
  });
});
