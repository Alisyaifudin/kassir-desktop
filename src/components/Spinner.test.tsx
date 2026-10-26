import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Spinner } from "./Spinner";

/** The inline busy indicator: absent when not busy, and the caller's class lands. */
describe("Spinner", () => {
  test("draws nothing when it is not spinning", () => {
    const { container } = render(<Spinner when={false} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  test("draws a spinning icon, with the caller's class merged in", () => {
    const { container } = render(<Spinner when className="text-destructive" />);
    const svg = container.querySelector("svg");

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("class")).toContain("animate-spin");
    expect(svg?.getAttribute("class")).toContain("text-destructive");
  });
});
