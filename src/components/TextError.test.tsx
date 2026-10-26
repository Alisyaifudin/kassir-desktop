import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { TextError } from "./TextError";

/**
 * The inline form error. It has two call shapes — "render this string unless it
 * is empty" and "render when this boolean says so" — and both have to stay quiet
 * rather than leave an empty line in the form.
 */
describe("TextError", () => {
  test("a message renders as a red small line", () => {
    render(<TextError>Harus angka</TextError>);

    const line = screen.getByText("Harus angka");
    expect(line.tagName).toBe("P");
    expect(line.className).toContain("text-red-500");
  });

  test("nothing to say renders nothing", () => {
    const { container } = render(
      <>
        <TextError>{null}</TextError>
        <TextError>{undefined}</TextError>
        <TextError>{""}</TextError>
      </>,
    );

    expect(container.textContent).toBe("");
  });

  test("with `when`, the boolean decides", () => {
    const { container, rerender } = render(<TextError when={false}>Harus angka</TextError>);
    expect(container.textContent).toBe("");

    rerender(<TextError when>Harus angka</TextError>);
    expect(screen.getByText("Harus angka")).toBeDefined();
  });
});
