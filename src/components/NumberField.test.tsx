import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { NumberField } from "./NumberField";

/**
 * The quantity/price field. It shows the Indonesian grouping (`1.000.000`) but
 * hands the form a raw numeric string, and the caret is managed by digit so a
 * Delete next to a grouping dot removes a digit instead of the dot — otherwise
 * the value silently changes by an order of magnitude.
 */
function Harness({ initial = "", onRaw }: { initial?: string; onRaw?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <NumberField
        aria-label="Jumlah"
        value={value}
        onValueChange={(next) => {
          onRaw?.(next);
          setValue(next);
        }}
      />
      <output data-testid="raw">{value}</output>
    </>
  );
}

const field = () => screen.getByLabelText("Jumlah") as HTMLInputElement;
const raw = () => screen.getByTestId("raw").textContent;

describe("NumberField", () => {
  test("shows the number grouped, and hands the form the raw digits", () => {
    render(<Harness initial="1000000" />);
    expect(field().value).toBe("1.000.000");

    fireEvent.change(field(), { target: { value: "1.000.001" } });
    expect(raw()).toBe("1000001");
  });

  test("an empty field is empty, not zero", () => {
    const seen: string[] = [];
    render(<Harness initial="42" onRaw={(v) => seen.push(v)} />);

    fireEvent.change(field(), { target: { value: "" } });

    expect(seen).toEqual([""]);
    expect(raw()).toBe("");
  });

  test("a lone minus is a value the cashier is still typing", () => {
    render(<Harness initial="" />);

    fireEvent.change(field(), { target: { value: "-" } });

    expect(raw()).toBe("-");
    expect(field().value).toBe("-");
  });

  test("text that is not a number is ignored", () => {
    const seen: string[] = [];
    render(<Harness initial="" onRaw={(v) => seen.push(v)} />);

    fireEvent.change(field(), { target: { value: "abc" } });

    expect(seen).toEqual([]);
  });

  test("Delete just before a grouping dot deletes the digit, not the dot", () => {
    render(<Harness initial="10000" />);
    const input = field();
    expect(input.value).toBe("10.000");

    act(() => input.setSelectionRange(2, 2));
    fireEvent.keyDown(input, { key: "Delete" });

    expect(raw()).toBe("1000");
    expect(field().value).toBe("1.000");
  });

  test("Backspace just after a grouping dot deletes the digit before it", () => {
    render(<Harness initial="10000" />);
    const input = field();

    act(() => input.setSelectionRange(3, 3));
    fireEvent.keyDown(input, { key: "Backspace" });

    expect(raw()).toBe("1000");
  });
});
