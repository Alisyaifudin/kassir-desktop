import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Input } from "./input";
import { InputCurrency } from "./input-currency";
import { InputPercent } from "./input-percent";

/**
 * The text fields declare `aria-autocomplete="list"`.
 *
 * This is a workaround, not an accessibility statement: the app runs in Edge's
 * WebView2, which paints its own suggestion dropdown over a text field as you
 * type, and `autocomplete="off"` does not stop it. A textbox that declares
 * `aria-autocomplete` is treated as one that owns its suggestions and is left
 * alone. Every `Input` in the app inherits this, which is why the test sits on the
 * three primitives rather than on the screens — and why a caller must still be
 * able to override it (the Combobox owns a real listbox).
 */
function attributes(element: HTMLElement, name: string): string | null {
  return element.getAttribute(name);
}

describe("the inputs keep Edge's suggestion box away", () => {
  test("Input declares it", () => {
    render(<Input aria-label="nama" />);
    expect(attributes(screen.getByLabelText("nama"), "aria-autocomplete")).toBe("list");
  });

  test("the money editor declares it too", () => {
    render(<InputCurrency aria-label="harga" value={0} onValueChange={() => {}} />);
    expect(attributes(screen.getByLabelText("harga"), "aria-autocomplete")).toBe("list");
  });

  test("so does the percentage editor", () => {
    render(<InputPercent aria-label="diskon" value={0} onValueChange={() => {}} />);
    expect(attributes(screen.getByLabelText("diskon"), "aria-autocomplete")).toBe("list");
  });

  test("a caller that owns a real listbox can still override it", () => {
    render(<Input aria-label="cari" aria-autocomplete="both" />);
    expect(attributes(screen.getByLabelText("cari"), "aria-autocomplete")).toBe("both");
  });
});
