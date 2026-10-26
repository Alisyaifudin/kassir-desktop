import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Kbd, KbdGroup } from "./kdb";

/**
 * The shortcut badge. It is a real `<kbd>` so assistive tech reads it as input,
 * and `data-slot` is what the select items and the tooltip style themselves from —
 * a div here would lose both.
 */
describe("Kbd", () => {
  test("is a <kbd> with the slot marker and the key text", () => {
    render(<Kbd>Ctrl+S</Kbd>);
    const key = screen.getByText("Ctrl+S");

    expect(key.tagName).toBe("KBD");
    expect(key.getAttribute("data-slot")).toBe("kbd");
  });

  test("the caller's class is merged with the badge styling", () => {
    render(<Kbd className="text-destructive">F1</Kbd>);
    const key = screen.getByText("F1");

    expect(key.className).toContain("text-destructive");
    expect(key.className).toContain("bg-muted");
  });
});

describe("KbdGroup", () => {
  test("groups several keys inline", () => {
    render(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );

    const group = screen.getByText("Ctrl").parentElement;
    expect(group?.tagName).toBe("KBD");
    expect(group?.getAttribute("data-slot")).toBe("kbd-group");
    expect(screen.getByText("K")).toBeDefined();
  });
});
