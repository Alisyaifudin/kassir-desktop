import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { InputCurrency } from "./input-currency";

/**
 * The rupiah field: grouped as typed, `.` and `,` both start the decimals, and
 * the caret moves by digit instead of by display column. Every rule here is money
 * — a dot that swallows a digit changes the amount by a factor of ten.
 */
function Harness({
  initial = 0,
  allowNegative = false,
  onValue,
}: {
  initial?: number;
  allowNegative?: boolean;
  onValue?: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <InputCurrency
      aria-label="Harga"
      value={value}
      allowNegative={allowNegative}
      onValueChange={(next) => {
        onValue?.(next);
        setValue(next);
      }}
    />
  );
}

const field = () => screen.getByLabelText("Harga") as HTMLInputElement;

describe("InputCurrency", () => {
  test("groups thousands behind the Rp prefix", () => {
    render(<Harness initial={1_000_000} />);
    expect(field().value).toBe("Rp1.000.000");
  });

  test("zero shows as a blank field, not `Rp0`", () => {
    render(<Harness initial={0} />);
    expect(field().value).toBe("");
  });

  test("typing digits emits the number without grouping", () => {
    const seen: number[] = [];
    render(<Harness onValue={(value) => seen.push(value)} />);

    fireEvent.change(field(), { target: { value: "Rp100.001" } });

    expect(seen.at(-1)).toBe(100_001);
    expect(field().value).toBe("Rp100.001");
  });

  test("a decimal comma is kept; a dot in a pasted value is grouping", () => {
    render(<Harness initial={10_000} />);

    fireEvent.change(field(), { target: { value: "Rp10.000,5" } });
    expect(field().value).toBe("Rp10.000,5");

    // A paste carries display text, where `.` is already the grouping mark.
    fireEvent.change(field(), { target: { value: "Rp12.5" } });
    expect(field().value).toBe("Rp125");
  });

  test("typing `.` starts the decimals, as it does on a keyboard", () => {
    render(<Harness initial={1_000} />);
    const input = field();
    act(() => input.setSelectionRange(input.value.length, input.value.length));

    fireEvent.keyDown(input, { key: "." });

    expect(field().value).toBe("Rp1.000,");
  });

  test("a second separator is not a second decimal point", () => {
    render(<Harness initial={0} />);

    fireEvent.change(field(), { target: { value: "Rp1,2,3" } });

    expect(field().value).toBe("Rp1,23");
  });

  test("a minus is only a sign when the caller allows it", () => {
    const allowed = render(<Harness initial={-5_000} allowNegative />);
    expect(field().value).toBe("-Rp5.000");
    allowed.unmount();

    // Typing a minus where it is not allowed leaves the digits only.
    render(<Harness initial={0} />);
    fireEvent.change(field(), { target: { value: "-5000" } });
    expect(field().value).toBe("Rp5.000");
  });

  test("typing `.` on an empty field starts a leading zero and the decimals", () => {
    render(<Harness initial={0} />);
    const input = field();

    act(() => input.setSelectionRange(0, 0));
    fireEvent.keyDown(input, { key: "." });

    expect(field().value).toBe("Rp0,");
  });

  test("Backspace removes the digit before the caret, not the grouping dot", () => {
    render(<Harness initial={10_000} />);
    const input = field();
    act(() => input.setSelectionRange(input.value.length, input.value.length));

    fireEvent.keyDown(input, { key: "Backspace" });

    expect(field().value).toBe("Rp1.000");
  });

  test("ArrowLeft steps over the grouping dot", () => {
    render(<Harness initial={10_000} />);
    const input = field();
    act(() => input.setSelectionRange(input.value.length, input.value.length));

    fireEvent.keyDown(input, { key: "ArrowLeft" });

    // `Rp10.000` → the caret lands before the last digit, at index 7.
    expect(input.selectionStart).toBe(7);
  });

  test("an external write (undo, reload) replaces what is shown", () => {
    const { rerender } = render(
      <InputCurrency aria-label="Harga" value={5_000} onValueChange={() => {}} />,
    );
    expect(field().value).toBe("Rp5.000");

    rerender(<InputCurrency aria-label="Harga" value={750_000} onValueChange={() => {}} />);
    expect(field().value).toBe("Rp750.000");
  });
});
