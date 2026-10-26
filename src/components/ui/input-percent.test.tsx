import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { InputPercent } from "./input-percent";

/**
 * The percentage field: one decimal separator, a fixed `%` suffix, and a value
 * clamped to what the caller allows. A discount typed `150` must land as the
 * maximum rather than as a quarter more than the goods.
 */
function Harness({
  initial = 0,
  min,
  max,
}: {
  initial?: number;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <InputPercent
      aria-label="Persen"
      value={value}
      min={min}
      max={max}
      onValueChange={setValue}
    />
  );
}

const field = () => screen.getByLabelText("Persen") as HTMLInputElement;

describe("InputPercent", () => {
  test("shows the number and a fixed percent sign", () => {
    render(<Harness initial={10} />);
    expect(field().value).toBe("10");
    expect(screen.getByText("%")).toBeDefined();
  });

  test("zero is blank rather than `0`", () => {
    render(<Harness initial={0} />);
    expect(field().value).toBe("");
  });

  test("a dot is shown as the decimal comma", () => {
    render(<Harness initial={0} />);
    fireEvent.change(field(), { target: { value: "12.5" } });
    expect(field().value).toBe("12,5");
  });

  test("the value is clamped to the maximum", () => {
    render(<Harness initial={0} max={100} />);
    fireEvent.change(field(), { target: { value: "150" } });
    expect(field().value).toBe("100");
  });

  test("a minus is only accepted while the minimum is below zero", () => {
    const negative = render(<Harness initial={0} min={-100} />);
    fireEvent.change(field(), { target: { value: "-15" } });
    expect(field().value).toBe("-15");
    negative.unmount();

    render(<Harness initial={0} min={0} />);
    fireEvent.change(field(), { target: { value: "-15" } });
    expect(field().value).toBe("15");
  });

  test("clearing the field stays blank and reads as zero", () => {
    render(<Harness initial={25} />);

    fireEvent.change(field(), { target: { value: "" } });

    expect(field().value).toBe("");
  });

  test("an external write replaces what is shown", () => {
    const { rerender } = render(
      <InputPercent aria-label="Persen" value={5} onValueChange={() => {}} />,
    );
    rerender(<InputPercent aria-label="Persen" value={42} onValueChange={() => {}} />);
    expect(field().value).toBe("42");
  });
});
