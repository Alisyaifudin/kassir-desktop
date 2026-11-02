import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

/**
 * The one bar shared by the sync rows and the backup panel. What matters is the
 * contract a screen reader gets: a bar with a denominator announces its value, a
 * bar without one announces no value at all (rather than a frozen 0%).
 */
describe("ProgressBar", () => {
  test("a determinate bar announces its value and fills to it", () => {
    const { container } = render(<ProgressBar percent={42} label="Kemajuan" />);
    const bar = container.querySelector('[role="progressbar"]');
    const fill = bar?.firstElementChild as HTMLElement | null;

    expect(bar?.getAttribute("aria-valuenow")).toBe("42");
    expect(bar?.getAttribute("aria-label")).toBe("Kemajuan");
    expect(fill?.style.width).toBe("42%");
  });

  test("no denominator means no value, and the pulsing sliver instead", () => {
    const { container } = render(<ProgressBar percent={null} label="Kemajuan" />);
    const bar = container.querySelector('[role="progressbar"]');
    const fill = bar?.firstElementChild as HTMLElement | null;

    expect(bar?.hasAttribute("aria-valuenow")).toBe(false);
    expect(fill?.getAttribute("class")).toContain("animate-pulse");
  });

  test("out-of-range values are clamped, so a bad fraction cannot break the layout", () => {
    const { container } = render(<ProgressBar percent={140} label="Kemajuan" />);
    expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe(
      "100",
    );
  });
});
